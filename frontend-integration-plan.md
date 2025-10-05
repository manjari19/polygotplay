# Frontend Integration Plan

## Overview
This plan outlines how to modify the Next.js frontend to integrate with the Python voice chatbot API.

## Changes Required

### 1. Update app/play/[episodeId]/page.js

#### Current State
- Demo conversation with hardcoded text
- Basic audio recording that creates WebM blob
- No backend integration

#### Required Changes
1. Add state management for session ID and conversation
2. Initialize session on component mount
3. Send recorded audio to backend
4. Handle and play audio responses
5. Display real conversation messages

### 2. New State Variables
```javascript
const [sessionId, setSessionId] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [conversation, setConversation] = useState([]);
const [currentMessage, setCurrentMessage] = useState("");
const [isRecording, setIsRecording] = useState(false);
const [error, setError] = useState(null);
```

### 3. API Integration Functions

#### Initialize Session
```javascript
async function initializeSession(scenarioId, language) {
  try {
    const response = await fetch('http://localhost:8000/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioId, language })
    });
    const data = await response.json();
    setSessionId(data.sessionId);
    setCurrentMessage(data.message);
    setConversation([{ role: 'assistant', text: data.message }]);
    
    // Play initial audio
    playAudioResponse(data.audioUrl);
  } catch (error) {
    setError('Failed to start session');
  }
}
```

#### Process Audio
```javascript
async function processAudio(audioBlob) {
  if (!sessionId) return;
  
  setIsLoading(true);
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  try {
    const response = await fetch(`http://localhost:8000/api/session/${sessionId}/process`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    
    // Update conversation
    setConversation(prev => [...prev, { role: 'assistant', text: data.message }]);
    setCurrentMessage(data.message);
    
    // Play audio response
    playAudioResponse(data.audioUrl);
    
    // Check if conversation is complete
    if (data.isComplete) {
      // Handle completion
    }
  } catch (error) {
    setError('Failed to process audio');
  } finally {
    setIsLoading(false);
  }
}
```

### 4. Audio Recording Enhancements

#### Modified Recording Handler
```javascript
async function startRecording() {
  if (!navigator.mediaDevices) return;
  
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      sampleRate: 44100,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true
    }
  });
  
  const mediaRecorder = new window.MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'
  });
  
  mediaRecorderRef.current = mediaRecorder;
  audioChunksRef.current = [];
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunksRef.current.push(e.data);
  };
  
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    await processAudio(audioBlob);
  };
  
  mediaRecorder.start(100); // Collect data every 100ms
  setIsRecording(true);
}
```

### 5. UI Updates

#### Recording Indicator
```jsx
<div className="mt-4 text-lg font-semibold text-center">
  {isRecording ? (
    <div className="flex items-center justify-center gap-2">
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      Recording... Release 'r' to stop
    </div>
  ) : isLoading ? (
    <div className="flex items-center justify-center gap-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin"></div>
      Processing...
    </div>
  ) : (
    "Hold 'r' to record"
  )}
</div>
```

#### Error Display
```jsx
{error && (
  <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
    {error}
  </div>
)}
```

#### Conversation History
```jsx
<div className="mt-8 max-w-2xl mx-auto">
  <h2 className="text-2xl font-bold mb-4">Conversation</h2>
  {conversation.map((msg, idx) => (
    <div key={idx} className={`mb-3 p-3 rounded-lg ${
      msg.role === 'assistant' 
        ? 'bg-blue-100 text-blue-900' 
        : 'bg-gray-100 text-gray-900'
    }`}>
      <strong>{msg.role === 'assistant' ? 'Assistant' : 'You'}:</strong> {msg.text}
    </div>
  ))}
</div>
```

### 6. Component Lifecycle

#### useEffect for Session Initialization
```javascript
useEffect(() => {
  if (episodeId && lang) {
    // Map frontend IDs to Python scenario names
    const scenarioMap = {
      'restaurant': 'restaurant',
      'intro': 'introductions',
      'airport': 'travel',
      'directions': 'directions'
    };
    
    const scenario = scenarioMap[episodeId] || 'restaurant';
    initializeSession(scenario, lang);
  }
}, [episodeId, lang]);
```

### 7. Audio Playback Helper
```javascript
async function playAudioResponse(audioUrl) {
  try {
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error('Failed to play audio:', error);
  }
}
```

## Testing Strategy

### 1. Unit Testing
- Test API integration functions
- Test audio recording functionality
- Test state management

### 2. Integration Testing
- Test full conversation flow
- Test error handling
- Test audio playback

### 3. User Testing
- Test recording quality
- Test response times
- Test overall user experience

## Deployment Considerations

### Development
- Python API server: `http://localhost:8000`
- Next.js dev server: `http://localhost:3000`

### Production
- Configure CORS for production domains
- Use HTTPS for all API calls
- Implement proper error boundaries
- Add loading states and retry logic