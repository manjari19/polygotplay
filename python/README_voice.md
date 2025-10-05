# Voice Language Learning Chatbot

This directory contains a voice-enabled version of the language learning chatbot that integrates speech-to-text (STT) and text-to-speech (TTS) capabilities.

## Files

- `audio_interface.py` - Handles audio recording, speech-to-text, and text-to-speech
- `voice_convo.py` - Main voice conversation application
- `testconvo.py` - Original text-based conversation application
- `stt.py` - Original speech-to-text implementation
- `tts.py` - Original text-to-speech implementation

## Setup

1. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up your environment variables in `.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ELEVEN_API_KEY=your_elevenlabs_api_key
   ```

## Usage

### Voice Conversation (Default: Push-to-Talk)

Run the voice chatbot with:
```bash
# Default scenario (cafe) in English with push-to-talk
python voice_convo.py

# Specific scenario
python voice_convo.py restaurant

# With language support
python voice_convo.py cafe --language french
python voice_convo.py travel --language spanish

# Auto-record mode (speak when prompted)
python voice_convo.py cafe --auto-record
python voice_convo.py restaurant --language spanish --auto-record

# List available scenarios and languages
python voice_convo.py --list
```

### Text Conversation

For text-based conversations, use the original script:
```bash
python voice_convo.py cafe --language french
```

## How It Works

1. **Audio Recording**: The system records audio from your microphone
2. **Speech-to-Text**: Converts your speech to text using ElevenLabs API
3. **AI Response**: Generates a response based on the scenario and conversation context
4. **Text-to-Speech**: Converts the AI's response to speech using ElevenLabs API
5. **Language Support**: Automatically adapts voices and responses for different languages

## Recording Modes

### Push-to-Talk Mode (Default)
- Press and HOLD spacebar to record
- Release spacebar to stop recording
- More natural conversation flow
- No time limits on recording

### Auto-Record Mode
- Use the `--auto-record` flag
- The system prompts you when to speak
- Records for up to 5 seconds
- Press Enter to stop recording early

## Controls

- **Recording**: 
  - Push-to-talk: Hold spacebar while speaking
  - Auto-record: Speak when prompted, press Enter to stop early
- **Exit**: Say "quit", "exit", "stop", or "end" to end the conversation
- **Interrupt**: Press Ctrl+C to immediately exit

## Supported Languages

- English (default)
- Spanish
- French
- Chinese
- Japanese
- German
- Italian
- Portuguese
- Russian
- Korean

## Voice Mappings

The system automatically selects appropriate voices for each language:
- English: Rachel
- Spanish: Domi
- French: Emile
- Chinese: Zhiyu
- Japanese: Mizuki
- German: Hansi
- Italian: Bella
- Portuguese: Domi
- Russian: Adam
- Korean: Jihoon

## Audio System

The system uses pygame for audio playback to ensure compatibility:
- Audio is saved to temporary files
- Played using pygame mixer
- Automatically cleaned up after playback
- Includes debug output for troubleshooting

## Troubleshooting

1. **No Audio Output**:
   - Check your system's audio output settings
   - Ensure pygame is installed correctly
   - Look for debug output showing the audio file path

2. **Microphone Issues**: Ensure your microphone is connected and not being used by other applications

3. **API Keys**: Verify your GEMINI_API_KEY and ELEVEN_API_KEY are correctly set

4. **Dependencies**: Make sure all required packages are installed

5. **PyAudio Installation Issues** (Windows): You might need to install it via wheel:
   ```bash
   pip install pipwin
   pipwin install pyaudio
   ```

6. **Keyboard Module**: If you get permission errors with the keyboard module, you may need to run as administrator

7. **Push-to-Talk Not Working**: Make sure the terminal window has focus when pressing spacebar

## Debug Output

The system now includes debug output to help troubleshoot audio issues:
- Shows which voice is being used
- Displays the temporary audio file path
- Indicates when audio is playing
- Shows error messages with full traceback if something fails

## Future Development

This voice interface is designed for testing purposes. For production use, you might want to:
- Implement a web interface using WebRTC for browser-based audio
- Add audio level indicators
- Implement noise cancellation
- Add conversation history persistence
- Create a more sophisticated wake word detection system