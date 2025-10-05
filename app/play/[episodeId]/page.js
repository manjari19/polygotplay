"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

// readable labels for nicer titles
const LANG_READABLE = {
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
};

const COUNTRY_BY_LANG = {
  ja: "Japan",
  fr: "France",
  es: "Spain",
  zh: "China",
};

// create a more natural, story-like heading
function getScenarioHeading(scenarioId, langCode) {
  const lang = LANG_READABLE[langCode] || "your target language";
  const country = COUNTRY_BY_LANG[langCode] || "this country";

  switch (scenarioId) {
    case "restaurant":
      return `Practice ordering food in ${country}`;
    case "intro":
      return `Start a friendly conversation in ${lang}`;
    case "airport":
      return `Get ready to check in at the airport`;
    case "directions":
      return `Ask for directions in ${country}`;
    default:
      return `Practice real conversations in ${lang}`;
  }
}

export default function PlayPage({ params }) {
  const { episodeId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang");

  // State for API integration
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [error, setError] = useState(null);
  const [speakingRole, setSpeakingRole] = useState(null);

  const BACKGROUNDS = {
    fr: "/img/france.png",
    ja: "/img/japan.png",
    es: "/img/spain.png",
    zh: "/img/china.png",
  };

  // Get the most recent messages for each role
  const assistantText = conversation.filter((t) => t.role === "assistant").pop()?.text || "Loading...";
  const userText = conversation.filter((t) => t.role === "user").pop()?.text || "";

  // build a natural title
  const heading = getScenarioHeading(episodeId, lang);

  // back handler (prefer episodes with lang, fallback to history)
  function handleBack() {
    if (lang) {
      router.push(`/episodes?lang=${encodeURIComponent(lang)}`);
    } else {
      router.back();
    }
  }

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const isMountedRef = useRef(true);
  const recordingStartTimeRef = useRef(null);

  // Keypress handler for 'r' to record
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "r" && !recording && sessionId) {
        e.preventDefault();
        setRecording(true);
        startRecording();
      }
    }
    function onKeyUp(e) {
      if (e.key === "r" && recording) {
        e.preventDefault();
        setRecording(false);
        stopRecording();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [recording, sessionId]);

  // Initialize session on component mount
  useEffect(() => {
    isMountedRef.current = true;
    
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
    
    return () => {
      isMountedRef.current = false;
    };
  }, [episodeId, lang]);

  // Initialize session with backend
  async function initializeSession(scenarioId, language) {
    setIsLoading(true);
    setError(null);
    
    const requestData = { scenario: scenarioId, language };
    console.log('Sending session start request:', requestData);
    
    try {
      const response = await fetch('http://localhost:8000/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Session start failed:', response.status, errorText);
        throw new Error(`Failed to start session: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSessionId(data.sessionId);
      setCurrentMessage(data.message);
      setConversation([{ role: 'assistant', text: data.message }]);
      
      // Play initial audio
      playAudioResponse(data.audioUrl, "assistant");
    } catch (error) {
      console.error('Failed to start session:', error);
      setError('Failed to start session. Please make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  }

  // Process user audio
  async function processAudio(audioBlob) {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    try {
      const response = await fetch(`http://localhost:8000/api/session/${sessionId}/process`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process audio: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Log the response for debugging
      console.log('API Response:', data);
      console.log('User text:', data.userText);
      console.log('Assistant text:', data.message);
      
      // Update conversation - add both user and assistant messages
      setConversation(prev => [
        ...prev,
        { role: 'user', text: data.userText },
        { role: 'assistant', text: data.message }
      ]);
      setCurrentMessage(data.message);
      
      // Play user audio (simulate, since only assistant audio is returned)
      if (data.userAudioUrl) {
        playAudioResponse(data.userAudioUrl, "user");
      }
      // Play assistant audio
      playAudioResponse(data.audioUrl, "assistant");
      
      // Check if conversation is complete
      if (data.isComplete) {
        console.log('Conversation complete!');
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Play audio response
  async function playAudioResponse(audioUrl, role = "assistant") {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setSpeakingRole(role);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      await audio.play();
      audio.onended = () => {
        setSpeakingRole(null);
      };
    } catch (error) {
      console.error('Failed to play audio:', error);
      setSpeakingRole(null);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices) {
      return;
    }
    
    if (!sessionId) {
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          latency: 0,
          googEchoCancellation: true,
          googNoiseSuppression: true,
          googAutoGainControl: true
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
        
        // Check if component is still mounted
        if (isMountedRef.current) {
          setAudioURL(URL.createObjectURL(audioBlob));
          
          // Send to backend for processing
          await processAudio(audioBlob);
        }
      };
      
      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecording(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Check minimum recording duration (1 second)
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      if (recordingDuration < 1000) {
        setRecording(false);
        return;
      }
      mediaRecorderRef.current.stop();
    }
    // Don't set recording state here, let the onstop handler handle it
  }

  return (
    <div
      className="relative min-h-screen text-[#1F1F1F] flex flex-col items-center overflow-hidden"
      style={{
        backgroundImage:
          lang && BACKGROUNDS[lang] ? `url(${BACKGROUNDS[lang]})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Back button (top-left) */}
      <motion.button
        onClick={handleBack}
        aria-label="Back to scenarios"
        className="fixed left-4 top-4 z-50 px-10 py-5 rounded-3xl bg-white/0 backdrop-blur-sm text-2xl font-bold shadow-lg hover:bg-white transition"
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.98 }}
      >
        ◀ Back 
      </motion.button>

      {/* Updated Title */}
      <motion.h1
        className="mt-16 text-4xl md:text-5xl font-bold text-center bg-white/60 backdrop-blur-sm rounded-2xl px-8 py-5 shadow-sm"
        style={{ fontFamily: 'Arial, sans-serif' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {heading}
      </motion.h1>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {/* Recording status */}
      <div className="mt-4 text-lg font-semibold text-center">
        {recording ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              Recording... Speak clearly and release 'r' to stop
            </div>
            <div className="text-sm text-gray-600">
              Speak loudly and clearly (minimum 1 second)
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin"></div>
            Processing...
          </div>
        ) : sessionId ? (
          <div className="flex flex-col items-center gap-1">
            <div>Hold 'r' to record</div>
            <div className="text-sm text-gray-600">
              Make sure your microphone is working and speak clearly
            </div>
          </div>
        ) : (
          "Initializing session..."
        )}
      </div>
      
      
      {/* Conversation History */}
      {/* {conversation.length > 1 && (
        <div className="mt-8 max-w-2xl mx-auto bg-white/80 backdrop-blur-sm rounded-lg p-4">
          <h2 className="text-xl font-bold mb-3">Conversation</h2>
          {conversation.map((msg, idx) => (
            <div key={idx} className={`mb-2 p-2 rounded ${
              msg.role === 'assistant'
                ? 'bg-blue-100 text-blue-900'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <strong>{msg.role === 'assistant' ? 'Assistant' : 'You'}:</strong> {msg.text}
            </div>
          ))}
        </div>
      )} */}
      
      {/* Characters row (anchored higher on screen) */}
      <div className="pointer-events-none absolute bottom-32 md:bottom-40 left-0 right-0 w-full flex items-end justify-between px-[8%]">
        {/* Panda (assistant, left) */}
        <CharacterWithBubble
          side="left"
          imgSrc="/img/panda.png"
          alt="Panda character"
          bubbleText={assistantText}
          isSpeaking={speakingRole === "assistant"}
        />

        {/* Llama (user, right) */}
        <CharacterWithBubble
          side="right"
          imgSrc="/img/llama.png"
          alt="Llama character"
          bubbleText={userText}
          isSpeaking={recording}
        />
      </div>
    </div>
  );
}

/* ========== Components ========== */

function CharacterWithBubble({ side, imgSrc, alt, bubbleText, isSpeaking }) {
  const translateClass =
    side === "left" ? "translate-x-[-4%]" : "translate-x-[4%]";
  const bubbleColor =
    side === "left"
      ? "bg-blue-100 text-blue-900 border-blue-200"
      : "bg-gray-100 text-gray-900 border-gray-200";

  // Animation for audio playing
  const speaking = isSpeaking && bubbleText && bubbleText.length > 0;

  return (
    <motion.div
      className={`relative flex flex-col items-center ${translateClass}`}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SpeechBubble side={side} className={`${bubbleColor}`}>
        {bubbleText}
      </SpeechBubble>

      <motion.img
        src={imgSrc}
        alt={alt}
        className="rounded-full shadow-xl select-none object-contain pointer-events-auto"
        initial={{ scale: 0.95 }}
        animate={speaking ? { scale: [1, 1.08, 1], y: [0, -10, 0] } : { scale: 1, y: 0 }}
        transition={speaking ? { duration: 0.8, repeat: Infinity, repeatType: 'loop' } : { type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.04, rotate: side === "left" ? -1.5 : 1.5 }}
        style={{
          width: "clamp(360px, 42vw, 510px)",
          height: "clamp(360px, 42vw, 510px)",
        }}
      />
    </motion.div>
  );
}

function SpeechBubble({ children, side, className = "" }) {
  const tailSide =
    side === "left"
      ? "left-[28%] md:left-[35%] rotate-45"
      : "right-[28%] md:right-[35%] -rotate-45";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`pointer-events-auto relative mb-8 max-w-xl text-2xl md:text-3xl leading-snug px-8 py-6 rounded-3xl shadow-2xl bg-white/10 font-bold text-black ${className}`}
      style={{
        backdropFilter: "blur(2px)",
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {children}
      <span
        className={`absolute -bottom-2 h-8 w-8 bg-inherit ${tailSide}`}
        style={{
          backgroundClip: "padding-box",
        }}
      />
    </motion.div>
  );
}
