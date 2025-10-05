# Running the Integrated Voice Chatbot System

This guide explains how to run the integrated system that connects the Next.js frontend to the Python voice chatbot backend.

## Prerequisites

1. **Python Dependencies**: Install the required Python packages
   ```bash
   cd python
   pip install -r requirements.txt
   ```

2. **Environment Variables**: Make sure you have the required API keys set up
   - Create a `.env` file in the `python/` directory
   - Add the following variables:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ELEVEN_API_KEY=your_elevenlabs_api_key_here
     ```

## Running the System

You need to run both the frontend and backend servers simultaneously.

### 1. Start the Python Backend Server

Open a terminal and run:
```bash
cd python
python api_server.py
```

The server will start on `http://localhost:8000`
- API endpoints are available at `http://localhost:8000/api/`
- Audio files are served from `http://localhost:8000/audio/`
- You can view the API documentation at `http://localhost:8000/docs`

### 2. Start the Next.js Frontend

Open a second terminal and run:
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## Using the Application

1. Open your browser and go to `http://localhost:3000`
2. Select a target language (French, Spanish, Chinese, or Japanese)
3. Select a scenario (Restaurant, Directions, Airport, or Introductions)
4. The conversation page will load with an initial greeting from the AI
5. Hold the 'r' key to record your voice input
6. Release 'r' to stop recording and send to the backend
7. The AI will respond with both text and voice
8. Continue the conversation through the scenario steps

## Troubleshooting

### Backend Issues

**Error: "GEMINI_API_KEY not configured"**
- Make sure you have a `.env` file in the `python/` directory
- Check that your Gemini API key is correctly set

**Error: "Failed to initialize chatbot"**
- Verify your API keys are valid
- Check that you have an active internet connection

**Error: "No speech detected in audio"**
- Make sure your microphone is working
- Speak clearly when recording
- Check that audio permissions are granted in your browser

### Frontend Issues

**Error: "Failed to start session"**
- Make sure the backend server is running on `http://localhost:8000`
- Check the browser console for more detailed error messages

**Audio not playing**
- Check that your browser allows audio playback
- Make sure your speakers/headphones are connected
- Check browser console for audio-related errors

### CORS Issues

If you see CORS errors in the browser console or OPTIONS requests failing:
- Make sure the backend server is running on `http://localhost:8000`
- Check that the CORS configuration in `api_server.py` includes your frontend URL
- Restart the backend server after making any CORS configuration changes
- The browser may cache failed CORS preflight requests, so try a hard refresh (Ctrl+F5)

**Debugging CORS Issues:**
1. Try running the simple test server: `python simple_server.py`
2. Test with curl: `curl -X OPTIONS http://localhost:8000/api/session/start -H "Origin: http://localhost:3000" -v`
3. Check if the issue is specific to Windows or your network configuration
4. Try using a different browser or incognito mode to rule out caching issues

## Development Notes

### File Structure
```
polygotplay/
├── app/
│   ├── page.js                    # Language selection
│   ├── episodes/page.js           # Scenario selection
│   └── play/[episodeId]/page.js   # Conversation page (updated)
├── python/
│   ├── api_server.py              # NEW: FastAPI server
│   ├── voice_convo.py             # Existing chatbot logic
│   ├── audio_interface.py         # Updated with file saving
│   ├── requirements.txt           # Updated with new dependencies
│   └── audio/                     # Created automatically for session audio
└── README_INTEGRATION.md          # This file
```

### API Endpoints

- `POST /api/session/start` - Start a new conversation session
- `POST /api/session/{sessionId}/process` - Process audio input
- `GET /api/session/{sessionId}/status` - Get session status
- `DELETE /api/session/{sessionId}` - End session
- `GET /api/health` - Health check

### Audio Processing Flow

1. Frontend records audio as WebM blob
2. Audio is sent to backend via multipart form data
3. Backend converts/transcribes using ElevenLabs STT
4. Text is processed by the VoiceLanguageLearningChatbot
5. Response is converted to speech using ElevenLabs TTS
6. Audio file is saved and URL returned to frontend
7. Frontend plays the audio response

### Session Management

- Sessions are stored in memory (for development)
- Each session has a unique UUID
- Sessions timeout after 30 minutes of inactivity
- Audio files are stored in `python/audio/{sessionId}/`
- Sessions are automatically cleaned up when expired

## Production Considerations

For production deployment, consider:

1. **Persistent Session Storage**: Replace in-memory sessions with Redis
2. **Audio File Storage**: Use cloud storage (S3, GCS) instead of local files
3. **HTTPS**: Serve both frontend and backend over HTTPS
4. **Load Balancing**: Add load balancer for multiple backend instances
5. **Monitoring**: Add logging and monitoring for API performance
6. **Rate Limiting**: Implement rate limiting for API endpoints

## Testing the Integration

To test that everything is working:

1. Start both servers as described above
2. Open the browser to `http://localhost:3000`
3. Select a language and scenario
4. Verify the initial AI greeting plays
5. Record a test message by holding 'r'
6. Verify the AI responds to your message
7. Check that the conversation appears in the history

If all these steps work, your integration is successful!