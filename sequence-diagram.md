# Sequence Diagram: Frontend-Backend Interaction

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant VoiceEngine
    participant STT
    participant AI
    participant TTS

    User->>Frontend: Selects language & scenario
    Frontend->>Backend: POST /api/session/start
    Note over Backend: Create new session
    Backend->>VoiceEngine: Initialize VoiceLanguageLearningChatbot
    VoiceEngine->>AI: Generate initial greeting
    AI-->>VoiceEngine: Return greeting text
    VoiceEngine->>TTS: Convert text to speech
    TTS-->>VoiceEngine: Return audio
    Backend-->>Frontend: {sessionId, message, audioUrl}
    Frontend-->>User: Play initial greeting

    User->>Frontend: Holds 'r' to record
    Frontend->>Frontend: Capture audio from microphone
    User-->>Frontend: Releases 'r'
    Frontend->>Backend: POST /api/session/{id}/process (audio)
    
    Backend->>STT: Convert audio to text
    STT-->>Backend: Return transcribed text
    Backend->>VoiceEngine: Process user input
    VoiceEngine->>AI: Generate response
    AI-->>VoiceEngine: Return response text
    VoiceEngine->>TTS: Convert response to speech
    TTS-->>VoiceEngine: Return audio
    Backend-->>Frontend: {message, audioUrl, isComplete}
    Frontend-->>User: Display message & play audio

    alt Conversation continues
        User->>Frontend: Records more audio
        Frontend->>Backend: POST /api/session/{id}/process
        Note right of Backend: Repeat processing loop
    else Conversation ends
        Backend-->>Frontend: {message, audioUrl, isComplete: true}
        Frontend-->>User: Show completion message
    end
```

## Key Components

### Frontend Responsibilities
1. Capture audio from microphone
2. Send audio to backend for processing
3. Display conversation messages
4. Play audio responses
5. Manage session state

### Backend Responsibilities
1. Create and manage conversation sessions
2. Process audio files (convert format)
3. Handle speech-to-text conversion
4. Generate AI responses
5. Convert text to speech
6. Serve audio files

### Voice Engine (VoiceLanguageLearningChatbot)
1. Maintain conversation context
2. Track scenario progress
3. Handle language learning logic
4. Manage conversation steps