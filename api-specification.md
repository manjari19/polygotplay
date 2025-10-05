# API Specification for Voice Chatbot Integration

## Base URL
`http://localhost:8000/api`

## Endpoints

### 1. Start Session
**POST** `/session/start`

Initiates a new conversation session with the specified scenario and language.

**Request Body:**
```json
{
  "scenario": "restaurant",
  "language": "chinese"
}
```

**Response (200 OK):**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Bonjour ! Bienvenue à notre restaurant.",
  "audioUrl": "http://localhost:8000/audio/123e4567-e89b-12d3-a456-426614174000/initial.mp3",
  "scenario": {
    "title": "Dining at a Restaurant",
    "role": "waiter"
  }
}
```

**Error Responses:**
- 400 Bad Request: Invalid scenario or language
- 500 Internal Server Error: Failed to initialize session

### 2. Process Audio
**POST** `/session/{sessionId}/process`

Processes user audio input and returns AI response.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `audio` (audio file)

**Response (200 OK):**
```json
{
  "message": "Je vous écoute. Qu'aimeriez-vous boire ?",
  "audioUrl": "http://localhost:8000/audio/123e4567-e89b-12d3-a456-426614174000/response_001.mp3",
  "isComplete": false,
  "currentStep": "taking_drink_order"
}
```

**Error Responses:**
- 404 Not Found: Session not found
- 400 Bad Request: No audio file provided
- 413 Payload Too Large: Audio file too large
- 500 Internal Server Error: Processing failed

### 3. Get Session Status
**GET** `/session/{sessionId}/status`

Retrieves current session status and conversation progress.

**Response (200 OK):**
```json
{
  "isActive": true,
  "currentStep": "taking_drink_order",
  "stepName": "Taking Drink Order",
  "isComplete": false,
  "exchangeCount": 3
}
```

**Error Responses:**
- 404 Not Found: Session not found

### 4. End Session
**DELETE** `/session/{sessionId}`

Ends the conversation session and cleans up resources.

**Response (200 OK):**
```json
{
  "message": "Session ended successfully"
}
```

## Data Models

### Session
```python
class Session:
    id: str
    chatbot: VoiceLanguageLearningChatbot
    created_at: datetime
    last_activity: datetime
    audio_counter: int
```

### Audio Processing
- Supported input formats: WebM, WAV, MP3
- Maximum file size: 10MB
- Sample rate: 44.1kHz (converted if necessary)
- Channels: Mono (converted if necessary)

## Implementation Details

### Session Management
- Sessions stored in memory dictionary (production: Redis)
- Session timeout after 30 minutes of inactivity
- UUID v4 for session IDs
- Automatic cleanup of expired sessions

### Audio Handling
1. Receive uploaded audio file
2. Convert to WAV format if needed
3. Process through ElevenLabs STT
4. Generate AI response
5. Convert response to speech using ElevenLabs TTS
6. Save audio file and return URL

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Environment Variables Required
```
GEMINI_API_KEY=your_gemini_api_key
ELEVEN_API_KEY=your_elevenlabs_api_key
```

## File Structure for Audio Storage
```
python/
├── audio/
│   └── {sessionId}/
│       ├── initial.mp3
│       ├── response_001.mp3
│       ├── response_002.mp3
│       └── ...
```

## Dependencies to Add
```
fastapi>=0.104.0
uvicorn>=0.24.0
python-multipart>=0.0.6
aiofiles>=23.2.1