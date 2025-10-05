import os
import pyaudio
import wave
import tempfile
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import threading
import time
import io
import pygame

load_dotenv()

class AudioInterface:
    def __init__(self):
        # Initialize ElevenLabs client
        self.elevenlabs = ElevenLabs(
            api_key=os.getenv("ELEVEN_API_KEY"),
        )
        
        # Audio recording parameters
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.RATE = 44100
        self.CHUNK = 1024
        self.RECORD_SECONDS = 5  # Maximum recording time
        self.audio = pyaudio.PyAudio()
        
        # Initialize pygame mixer for audio playback
        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
        
        # Voice mappings for different languages
        self.voice_mappings = {
            "english": "UpphzPau5vxibPYV2NeV",
            "spanish": "9EU0h6CVtEDS6vriwwq5",
            "french": "ohItIVrXTBI80RrUECOD",
            "chinese": "ZL9dtgFhmkTzAHUUtQL8",
            "japanese": "3JDquces8E8bkmvbh6Bc"
        }
    
    def record_audio(self, max_seconds=5):
        """Record audio from microphone and save to temporary file."""
        print("\n🎤 Recording... Speak now (press Enter to stop early)")
        
        stream = self.audio.open(format=self.FORMAT,
                                channels=self.CHANNELS,
                                rate=self.RATE,
                                input=True,
                                frames_per_buffer=self.CHUNK)
        
        frames = []
        
        # Start recording in a separate thread to allow early termination
        stop_recording = threading.Event()
        
        def input_listener():
            input()  # Wait for Enter key
            stop_recording.set()
        
        input_thread = threading.Thread(target=input_listener)
        input_thread.daemon = True
        input_thread.start()
        
        start_time = time.time()
        while not stop_recording.is_set() and (time.time() - start_time) < max_seconds:
            data = stream.read(self.CHUNK)
            frames.append(data)
        
        stream.stop_stream()
        stream.close()
        
        if stop_recording.is_set():
            print("Recording stopped by user")
        else:
            print("Maximum recording time reached")
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with wave.open(temp_file.name, 'wb') as wf:
            wf.setnchannels(self.CHANNELS)
            wf.setsampwidth(self.audio.get_sample_size(self.FORMAT))
            wf.setframerate(self.RATE)
            wf.writeframes(b''.join(frames))
        
        return temp_file.name
    
    def speech_to_text(self, audio_file_path):
        """Convert audio file to text using ElevenLabs STT."""
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcription = self.elevenlabs.speech_to_text.convert(
                    file=audio_file,
                    model_id="scribe_v1",
                    tag_audio_events=False,
                    diarize=False,
                )
            
            # Clean up temporary file
            if os.path.exists(audio_file_path):
                os.unlink(audio_file_path)
            
            # Extract both text and language_code from the transcription response
            result = {
                'text': '',
                'language_code': ''
            }
            
            if hasattr(transcription, 'text') and hasattr(transcription, 'language_code'):
                # Direct access to attributes
                result['text'] = transcription.text.strip()
                result['language_code'] = transcription.language_code
            else:
                # Parse from string representation
                transcription_str = str(transcription)
                
                # Extract text
                if 'text=' in transcription_str:
                    import re
                    text_match = re.search(r'text="([^"]*)"', transcription_str)
                    if text_match:
                        result['text'] = text_match.group(1).strip()
                
                # Extract language_code
                if 'language_code=' in transcription_str:
                    lang_match = re.search(r'language_code=\'([^\']*)\'', transcription_str)
                    if lang_match:
                        result['language_code'] = lang_match.group(1)
                
                # Fallback for text if not found
                if not result['text']:
                    result['text'] = transcription_str.strip()
            
            return result
        except Exception as e:
            print(f"Error in speech-to-text: {e}")
            # Clean up temporary file even if there's an error
            if os.path.exists(audio_file_path):
                os.unlink(audio_file_path)
            return {'text': '', 'language_code': ''}
    
    def text_to_speech(self, text, language="english"):
        """Convert text to speech using ElevenLabs TTS."""
        try:
            # Get appropriate voice for the language
            voice_id = self.voice_mappings.get(language.lower(), "rachel")
            
            print(f"Generating speech with voice: {voice_id}")
            print(f"Text to convert: '{text}'")
            
            audio = self.elevenlabs.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
            )
            
            print("Playing audio with ElevenLabs...")
            
            # Use ElevenLabs' native play function
            from elevenlabs.play import play
            play(audio)
            
            print("✅ Audio playback complete")
            return True
            
        except Exception as e:
            print(f"Error in text-to-speech: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def text_to_speech_file(self, text, language="english", output_path=None):
        """Convert text to speech and save to file using ElevenLabs TTS."""
        try:
            # Get appropriate voice for the language
            voice_id = self.voice_mappings.get(language.lower(), "rachel")
            
            print(f"Generating speech with voice: {voice_id}")
            print(f"Text to convert: '{text}'")
            
            audio = self.elevenlabs.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
            )
            
            # If no output path provided, create a temporary file
            if not output_path:
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                    output_path = temp_file.name
            
            # Save audio to file
            with open(output_path, "wb") as f:
                for chunk in audio:
                    f.write(chunk)
            
            print(f"✅ Audio saved to: {output_path}")
            return True
            
        except Exception as e:
            print(f"Error in text-to-speech: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def record_and_transcribe(self, max_seconds=5):
        """Record audio and return transcribed text."""
        audio_file = self.record_audio(max_seconds)
        return self.speech_to_text(audio_file)
    
    def record_audio_push_to_talk(self):
        """Record audio while spacebar is pressed (push-to-talk)."""
        import keyboard
        
        print("\n🎤 Press and HOLD SPACEBAR to record, release to stop...")
        
        # Wait for spacebar to be pressed
        while True:
            if keyboard.is_pressed('space'):
                break
            time.sleep(0.1)
        
        print("Recording... (release SPACEBAR to stop)")
        
        stream = self.audio.open(format=self.FORMAT,
                                channels=self.CHANNELS,
                                rate=self.RATE,
                                input=True,
                                frames_per_buffer=self.CHUNK)
        
        frames = []
        
        # Record while spacebar is held
        while keyboard.is_pressed('space'):
            data = stream.read(self.CHUNK)
            frames.append(data)
        
        stream.stop_stream()
        stream.close()
        
        print("Recording stopped")
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with wave.open(temp_file.name, 'wb') as wf:
            wf.setnchannels(self.CHANNELS)
            wf.setsampwidth(self.audio.get_sample_size(self.FORMAT))
            wf.setframerate(self.RATE)
            wf.writeframes(b''.join(frames))
        
        return temp_file.name
    
    def record_and_transcribe_push_to_talk(self):
        """Record audio using push-to-talk and return transcribed text."""
        audio_file = self.record_audio_push_to_talk()
        return self.speech_to_text(audio_file)
    
    def cleanup(self):
        """Clean up audio resources."""
        self.audio.terminate()
        pygame.mixer.quit()

# Example usage
if __name__ == "__main__":
    audio_interface = AudioInterface()
    
    try:
        print("Testing speech-to-text...")
        text = audio_interface.record_and_transcribe()
        print(f"You said: {text}")
        
        if text:
            print("\nTesting text-to-speech...")
            print(f"Speaking: {text}")
            audio_interface.text_to_speech(text, "english")
    finally:
        audio_interface.cleanup()