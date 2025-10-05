import os
import uuid
import json
import asyncio
import aiofiles
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import tempfile
import shutil

from voice_convo import VoiceLanguageLearningChatbot, load_scenarios_from_directory
from audio_interface import AudioInterface

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Voice Chatbot API", version="1.0.0")

# Configure CORS with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"]
)

# Create audio directory if it doesn't exist
AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Mount static files for audio serving
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# Load scenarios
SCENARIOS = load_scenarios_from_directory()

# Session storage (in-memory for development, should use Redis in production)
sessions: Dict[str, Dict] = {}

# Session timeout (30 minutes)
SESSION_TIMEOUT = timedelta(minutes=30)

# Pydantic models
class SessionStartRequest(BaseModel):
    scenario: str
    language: str

class SessionStartResponse(BaseModel):
    sessionId: str
    message: str
    audioUrl: str
    scenario: Dict

class SessionStatusResponse(BaseModel):
    isActive: bool
    currentStep: str
    stepName: str
    isComplete: bool
    exchangeCount: int

class AudioProcessResponse(BaseModel):
    message: str
    audioUrl: str
    isComplete: bool
    currentStep: str

# Helper functions
def cleanup_expired_sessions():
    """Remove expired sessions"""
    current_time = datetime.now()
    expired_sessions = [
        session_id for session_id, session_data in sessions.items()
        if current_time - session_data["last_activity"] > SESSION_TIMEOUT
    ]
    for session_id in expired_sessions:
        # Clean up audio files
        session_audio_dir = os.path.join(AUDIO_DIR, session_id)
        if os.path.exists(session_audio_dir):
            shutil.rmtree(session_audio_dir)
        # Remove from sessions
        del sessions[session_id]
        print(f"Cleaned up expired session: {session_id}")

def get_session(session_id: str) -> Dict:
    """Get session by ID or raise 404"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update last activity
    sessions[session_id]["last_activity"] = datetime.now()
    return sessions[session_id]

def create_session_audio_dir(session_id: str):
    """Create directory for session audio files"""
    session_dir = os.path.join(AUDIO_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    return session_dir

async def save_audio_file(session_id: str, audio_file: UploadFile, counter: int) -> str:
    """Save uploaded audio file and return the path"""
    session_dir = create_session_audio_dir(session_id)
    file_extension = os.path.splitext(audio_file.filename)[1]
    file_path = os.path.join(session_dir, f"input_{counter}{file_extension}")
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await audio_file.read()
        await f.write(content)
    
    return file_path

async def convert_to_wav(input_path: str) -> str:
    """Convert audio file to WAV format if needed"""
    try:
        # Check if file is already in WAV format
        if input_path.lower().endswith('.wav'):
            return input_path
            
        # For WebM files, we need to convert to WAV
        if input_path.lower().endswith('.webm'):
            # Create output path
            wav_path = input_path.replace('.webm', '.wav')
            
            # Try to use ffmpeg for conversion
            import subprocess
            try:
                result = subprocess.run([
                    'ffmpeg', '-i', input_path, '-ar', '16000', '-ac', '1', wav_path
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode != 0:
                    raise Exception(f"ffmpeg conversion failed: {result.stderr}")
                
                return wav_path
            except subprocess.TimeoutExpired:
                raise Exception("Audio conversion timed out")
            except FileNotFoundError:
                # Fallback to pydub if ffmpeg is not available
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_file(input_path)
                    audio.set_frame_rate(16000).set_channels(1).export(wav_path, format="wav")
                    return wav_path
                except ImportError:
                    return input_path
                except Exception:
                    return input_path
        
        # For other formats, return as-is
        return input_path
    except Exception:
        return input_path  # Return original file if conversion fails

async def generate_audio_response(session_id: str, text: str, language: str, counter: int) -> str:
    """Generate audio response from text and return the URL"""
    session_dir = create_session_audio_dir(session_id)
    output_path = os.path.join(session_dir, f"response_{counter:03d}.mp3")
    
    # Create a temporary audio interface instance
    audio_interface = AudioInterface()
    
    try:
        # Generate speech and save to file
        success = audio_interface.text_to_speech_file(text, language, output_path)
        if not success:
            raise Exception("Failed to generate audio response")
        
        # Return the URL
        return f"http://localhost:8000/audio/{session_id}/response_{counter:03d}.mp3"
    finally:
        audio_interface.cleanup()

# API Routes
@app.on_event("startup")
async def startup_event():
    """Initialize the API server"""
    print("Voice Chatbot API Server started")
    print(f"Loaded {len(SCENARIOS)} scenarios")
    cleanup_expired_sessions()

@app.post("/api/session/start", response_model=SessionStartResponse)
async def start_session(request: SessionStartRequest):
    """Start a new conversation session"""
    print(f"Session start request: scenario={request.scenario}, language={request.language}")
    
    # Validate scenario
    if request.scenario not in SCENARIOS:
        print(f"Invalid scenario: {request.scenario}")
        raise HTTPException(status_code=400, detail=f"Invalid scenario: {request.scenario}")
    
    # Validate language - accept both full names and short codes
    language_mapping = {
        "english": "english",
        "en": "english",
        "spanish": "spanish",
        "es": "spanish",
        "french": "french",
        "fr": "french",
        "chinese": "chinese",
        "zh": "chinese",
        "japanese": "japanese",
        "ja": "japanese",
        "german": "german",
        "de": "german",
        "italian": "italian",
        "it": "italian",
        "portuguese": "portuguese",
        "pt": "portuguese",
        "russian": "russian",
        "ru": "russian",
        "korean": "korean",
        "ko": "korean"
    }
    
    language_code = request.language.lower()
    if language_code not in language_mapping:
        print(f"Invalid language: {request.language}")
        raise HTTPException(status_code=400, detail=f"Invalid language: {request.language}")
    
    # Convert to full language name for the chatbot
    language = language_mapping[language_code]
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Initialize chatbot
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        
        chatbot = VoiceLanguageLearningChatbot(
            api_key=api_key,
            scenario=SCENARIOS[request.scenario],
            language=language
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize chatbot: {str(e)}")
    
    # Start conversation
    try:
        initial_message = chatbot.start_conversation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start conversation: {str(e)}")
    
    # Generate initial audio response
    try:
        audio_url = await generate_audio_response(
            session_id=session_id,
            text=initial_message,
            language=language,
            counter=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")
    
    # Store session
    sessions[session_id] = {
        "chatbot": chatbot,
        "created_at": datetime.now(),
        "last_activity": datetime.now(),
        "scenario": request.scenario,
        "language": language,
        "audio_counter": 1  # Next audio file number
    }
    
    return SessionStartResponse(
        sessionId=session_id,
        message=initial_message,
        audioUrl=audio_url,
        scenario={
            "title": SCENARIOS[request.scenario]["title"],
            "role": SCENARIOS[request.scenario]["role"]
        }
    )

@app.post("/api/session/{session_id}/process", response_model=AudioProcessResponse)
async def process_audio(session_id: str, audio: UploadFile = File(...)):
    """Process user audio input and return AI response"""
    # Get session
    session = get_session(session_id)
    chatbot = session["chatbot"]
    
    # Validate audio file
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    # Check file size (max 10MB)
    if audio.size and audio.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 10MB)")
    
    # Save audio file
    try:
        input_path = await save_audio_file(session_id, audio, session["audio_counter"])
        wav_path = await convert_to_wav(input_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio: {str(e)}")
    
    # Process audio through speech-to-text
    try:
        # Check if the audio file exists and has content
        import os
        if not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
            # Try to process with the original file if conversion failed
            wav_path = input_path
        
        audio_interface = AudioInterface()
        stt_result = audio_interface.speech_to_text(wav_path)
        
        if isinstance(stt_result, dict):
            user_input = stt_result.get('text', '')
            language_code = stt_result.get('language_code', '')
        else:
            # Backward compatibility
            user_input = stt_result
            language_code = ''
        
        if not user_input or user_input.strip() == '':
            # Don't raise an error, just return a default response
            user_input = "I didn't catch that, could you please repeat?"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")
    finally:
        audio_interface.cleanup()
    
    # Generate AI response
    try:
        ai_response, is_complete = chatbot.generate_response(user_input, language_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
    
    # Generate audio response
    try:
        audio_url = await generate_audio_response(
            session_id=session_id,
            text=ai_response,
            language=session["language"],
            counter=session["audio_counter"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")
    
    # Update session
    session["audio_counter"] += 1
    session["last_activity"] = datetime.now()
    
    # Get current step info
    current_step = chatbot.get_current_step()
    
    return AudioProcessResponse(
        message=ai_response,
        audioUrl=audio_url,
        isComplete=is_complete,
        currentStep=current_step["name"]
    )

@app.get("/api/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get current session status"""
    session = get_session(session_id)
    chatbot = session["chatbot"]
    
    current_step = chatbot.get_current_step()
    
    return SessionStatusResponse(
        isActive=True,
        currentStep=current_step["name"],
        stepName=current_step["name"].replace('_', ' ').title(),
        isComplete=chatbot.is_conversation_complete(),
        exchangeCount=current_step["exchange_count"]
    )

@app.delete("/api/session/{session_id}")
async def end_session(session_id: str):
    """End a conversation session and clean up resources"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Clean up chatbot
    try:
        sessions[session_id]["chatbot"].cleanup()
    except:
        pass  # Ignore cleanup errors
    
    # Clean up audio files
    session_dir = os.path.join(AUDIO_DIR, session_id)
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)
    
    # Remove session
    del sessions[session_id]
    
    return {"message": "Session ended successfully"}

@app.options("/api/session/start")
async def options_session_start():
    """Handle OPTIONS preflight request for session start"""
    return {"status": "ok"}

@app.options("/api/session/{session_id}/process")
async def options_session_process(session_id: str):
    """Handle OPTIONS preflight request for session process"""
    return {"status": "ok"}

@app.options("/api/session/{session_id}/status")
async def options_session_status(session_id: str):
    """Handle OPTIONS preflight request for session status"""
    return {"status": "ok"}

@app.options("/api/session/{session_id}")
async def options_session_end(session_id: str):
    """Handle OPTIONS preflight request for session end"""
    return {"status": "ok"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "active_sessions": len(sessions)}

# Add a catch-all OPTIONS handler (must be after all other routes)
@app.options("/{path:path}")
async def options_catch_all(path: str):
    """Handle OPTIONS preflight requests for all paths"""
    return {"status": "ok"}

# Run cleanup periodically
@app.on_event("startup")
async def setup_cleanup_task():
    """Setup periodic cleanup of expired sessions"""
    async def cleanup_task():
        while True:
            await asyncio.sleep(300)  # Run every 5 minutes
            cleanup_expired_sessions()
    
    asyncio.create_task(cleanup_task())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)