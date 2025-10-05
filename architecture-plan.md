# Architecture Plan: Connecting Frontend to Python Voice Chatbot

## Overview
This plan outlines how to connect the Next.js frontend to the Python voice conversation script using HTTP API endpoints.

## System Architecture

```
Frontend (Next.js)          Backend (FastAPI)          Voice Engine (Python)
├── Language Selection      ├── Session Management      ├── VoiceLanguageLearningChatbot
├── Scenario Selection      ├── Audio Processing        ├── AudioInterface
├── Audio Recording         ├── Conversation State     ├── Gemini API
├── Audio Playback          └── API Endpoints          └── ElevenLabs API
```

## API Design

### 1. Session Management Endpoint
```
POST /api/session/start
Body: {
  "scenario": "restaurant",
  "language": "chinese"
}
Response: {
  "sessionId": "uuid",
  "message": "Welcome message from AI",
  "audioUrl": "url-to-audio-response"
}
```

### 2. Audio Processing Endpoint
```
POST /api/session/{sessionId}/process
Body: Multipart form with audio file
Response: {
  "message": "AI response text",
  "audioUrl": "url-to-audio-response",
  "isComplete": false
}
```

### 3. Session Status Endpoint
```
GET /api/session/{sessionId}/status
Response: {
  "isActive": true,
  "currentStep": "greeting",
  "isComplete": false
}
```

## Implementation Details

### Backend (FastAPI Server)
1. Create a new FastAPI application in `python/api_server.py`
2. Implement session storage (in-memory dictionary or Redis)
3. Wrap the `VoiceLanguageLearningChatbot` class functionality
4. Handle audio file uploads and processing
5. Return audio responses as URLs to downloadable files

### Frontend Changes
1. Update `app/play/[episodeId]/page.js` to:
   - Start a session when the page loads
   - Replace demo audio recording with actual API calls
   - Play audio responses from the backend
   - Display conversation messages

### Data Flow
1. User selects language and scenario in frontend
2. Frontend calls `/api/session/start` with selected options
3. Backend initializes `VoiceLanguageLearningChatbot` and returns initial message
4. User records audio in frontend
5. Frontend sends audio to `/api/session/{sessionId}/process`
6. Backend processes audio through STT, generates AI response, converts to TTS
7. Backend returns text and audio URL to frontend
8. Frontend displays response and plays audio

## Technical Considerations

### Audio Handling
- Frontend records audio as WebM blob
- Backend converts to WAV for ElevenLabs compatibility
- Audio responses served as static files with proper CORS headers

### Session Management
- Use UUIDs for session identification
- Store chatbot instances in session dictionary
- Implement session timeout/cleanup

### Error Handling
- Validate audio file format and size
- Handle API failures gracefully
- Provide user-friendly error messages

## File Structure
```
python/
├── api_server.py          # New FastAPI server
├── voice_convo.py         # Existing script (minimal changes)
├── audio_interface.py     # Existing audio handling
├── requirements.txt       # Add FastAPI and dependencies
└── sessions/              # Temporary audio storage
    └── {sessionId}/
        ├── input.wav
        └── response.mp3
```

## Next Steps
1. Create the FastAPI server with session management
2. Implement the core API endpoints
3. Update the frontend to use the new API
4. Test the complete integration
5. Add error handling and validation