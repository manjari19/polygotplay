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

  // Hardcoded background images per language and scenario
  const BG_BY_LANG_AND_SCENARIO = {
    ja: {
      intro: "/img/japan.png",
      restaurant: "/img/japanese-restaurant.png",
      airport: "/img/japanese-airport.png",
      directions: "/img/japanese-directions.png",
    },
    es: {
      intro: "/img/spain.png",
      restaurant: "/img/spanish-restaurant.png",
      airport: "/img/spanish-airport.png",
      directions: "/img/spanish-directions.png",
    },
    zh: {
      intro: "/img/china-intro.png",
      restaurant: "/img/china-restaurant.png",
      airport: "/img/china-travel.png",
      directions: "/img/china-directions.png",
    },
    fr: {
      intro: "/img/france.png",
      restaurant: "/img/restaurant.png",
      airport: "/img/travel.png",
      directions: "/img/directions.png",
    },
  };

  function getBackgroundFor(langCode, scenarioId) {
    if (!langCode || !scenarioId) return null;
    const byLang = BG_BY_LANG_AND_SCENARIO[langCode];
    if (!byLang) return null;
    return byLang[scenarioId] || null;
  }

  // Get the most recent messages for each role
  const assistantText =
    conversation.filter((t) => t.role === "assistant").pop()?.text || "Loading...";
  const userText = conversation.filter((t) => t.role === "user").pop()?.text || "";

  // build a natural title
  const heading = getScenarioHeading(episodeId, lang);

  // back handler (prefer episodes with lang, fallback to history)
	function handleBack() {
		cleanupSession({ endRemote: true });
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
  const mediaStreamRef = useRef(null);
  const isMountedRef = useRef(true);
  const isAbortingRef = useRef(false);
  const recordingStartTimeRef = useRef(null);
  const sessionInitializedRef = useRef(false);

  // Cleanup routine: stop audio, stop recording, stop mic tracks, end backend session
  async function cleanupSession({ endRemote = true } = {}) {
    try {
      isAbortingRef.current = true;
      // Stop any playing audio immediately
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.src = "";
        } catch {}
        currentAudioRef.current = null;
      }

      // Stop MediaRecorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }

      // Stop microphone tracks
      if (mediaStreamRef.current) {
        try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch {}
        mediaStreamRef.current = null;
      }

      // Reset local UI state if still mounted
      if (isMountedRef.current) {
        setRecording(false);
        setSpeakingRole(null);
      }

      // End remote session to free server resources
      if (endRemote && sessionId) {
        try {
          fetch(`http://localhost:8000/api/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
        } catch {}
      }
    } catch {}
  }

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
    console.log('🔍 DEBUG: useEffect called with', { episodeId, lang });
    isMountedRef.current = true;
    isAbortingRef.current = false;
    
    if (episodeId && lang && !sessionInitializedRef.current) {
      // Mark session as initialized to prevent duplicate calls
      sessionInitializedRef.current = true;
      
      // Map frontend IDs to Python scenario names
      const scenarioMap = {
        restaurant: "restaurant",
        intro: "introductions",
        airport: "travel",
        directions: "directions",
      };
      
      const scenario = scenarioMap[episodeId] || 'restaurant';
      console.log('🔍 DEBUG: About to initializeSession with', { scenario, lang });
      initializeSession(scenario, lang);
    }

    return () => {
      console.log('🔍 DEBUG: useEffect cleanup called');
      isMountedRef.current = false;
      cleanupSession({ endRemote: true });
    };
  }, [episodeId, lang]);

  // Proactively stop audio when navigating with browser back/forward
  useEffect(() => {
    const onPopState = () => {
      cleanupSession({ endRemote: true });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [sessionId]);

  // Initialize session with backend
  async function initializeSession(scenarioId, language) {
    console.log('🔍 DEBUG: initializeSession called with', { scenarioId, language, sessionId: sessionId });
    setIsLoading(true);
    setError(null);

    const requestData = { scenario: scenarioId, language };
    console.log("Sending session start request:", requestData);

    try {
      const response = await fetch("http://localhost:8000/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Session start failed:", response.status, errorText);
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 DEBUG: Session start response received:', {
        sessionId: data.sessionId,
        message: data.message,
        audioUrl: data.audioUrl
      });
      
      setSessionId(data.sessionId);
      setCurrentMessage(data.message);
      setConversation([{ role: 'assistant', text: data.message }]);
      
      console.log('🔍 DEBUG: About to play initial audio');
      // Play initial audio
      playAudioResponse(data.audioUrl, "assistant");
    } catch (error) {
      console.error("Failed to start session:", error);
      setError("Failed to start session. Please make sure the backend server is running.");
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
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const response = await fetch(`http://localhost:8000/api/session/${sessionId}/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process audio: ${response.statusText}`);
      }

      const data = await response.json();

      // Update conversation - add both user and assistant messages
      setConversation((prev) => [
        ...prev,
        { role: "user", text: data.userText },
        { role: "assistant", text: data.message },
      ]);
      setCurrentMessage(data.message);

      if (data.userAudioUrl) {
        playAudioResponse(data.userAudioUrl, "user");
      }
      playAudioResponse(data.audioUrl, "assistant");

      if (data.isComplete) {
        console.log("Conversation complete!");
      }
    } catch (error) {
      console.error("Failed to process audio:", error);
      setError("Failed to process audio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Play audio response
  async function playAudioResponse(audioUrl, role = "assistant") {
    console.log('🔍 DEBUG: playAudioResponse called with', { audioUrl, role });
    try {
      if (currentAudioRef.current) {
        console.log('🔍 DEBUG: Stopping previous audio');
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setSpeakingRole(role);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      console.log('🔍 DEBUG: About to play audio');
      await audio.play();
      console.log('🔍 DEBUG: Audio playing successfully');
      audio.onended = () => {
        console.log('🔍 DEBUG: Audio playback ended');
        setSpeakingRole(null);
      };
    } catch (error) {
      console.error("Failed to play audio:", error);
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
          googAutoGainControl: true,
        },
      });

      const mediaRecorder = new window.MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (isMountedRef.current && !isAbortingRef.current) {
          setAudioURL(URL.createObjectURL(audioBlob));
          await processAudio(audioBlob);
        }
      };

      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecording(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      if (recordingDuration < 1000) {
        setRecording(false);
        return;
      }
      mediaRecorderRef.current.stop();
    }
  }

  return (
    <div
      className="relative min-h-screen text-[#1F1F1F] flex flex-col items-center overflow-hidden"
      style={{
        backgroundImage:
          lang && getBackgroundFor(lang, episodeId) ? `url(${getBackgroundFor(lang, episodeId)})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Subtle horizon wash so foreground reads clearly */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/70 via-white/25 to-transparent" />

      {/* Back button (top-left) */}
      <motion.button
        onClick={handleBack}
        aria-label="Back to scenarios"
        className="fixed left-4 top-4 z-50 px-6 py-3 rounded-full bg-white/80 backdrop-blur-md text-base md:text-lg font-semibold shadow-lg hover:bg-white transition"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.98 }}
      >
        ◀ Back
      </motion.button>

      {/* Title */}
      <motion.h1
        className="mt-16 text-3xl md:text-5xl font-bold text-center bg-white/80 backdrop-blur-md rounded-2xl px-6 py-4 shadow-sm z-10"
        style={{ fontFamily: "Arial, sans-serif" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {heading}
      </motion.h1>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl max-w-2xl mx-auto z-10 shadow">
          {error}
        </div>
      )}

      {/* Recording / status */}
      <div className="mt-4 text-lg font-semibold text-center z-10">
        {recording ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              Recording... Speak clearly and release 'r' to stop
            </div>
            <div className="text-sm text-gray-600">Speak loudly and clearly (minimum 1 second)</div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-spin"></div>
            Processing...
          </div>
        ) : sessionId ? (
          <div className="flex flex-col items-center gap-1">
            <div>Hold 'r' to record</div>
            <div className="text-sm text-gray-600">Make sure your microphone is working and speak clearly</div>
          </div>
        ) : (
          "Initializing session..."
        )}
      </div>

      {/* Grounding gradient near bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[18%]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/5 to-transparent" />
      </div>

      {/* Characters row */}
      <div className="pointer-events-none absolute bottom-[2%] md:bottom-[3%] left-0 right-0 w-full flex items-end justify-between px-[6%] md:px-[8%] z-10">
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
  const translateClass = side === "left" ? "translate-x-[-1%]" : "translate-x-[1%]";
  const speaking = isSpeaking && bubbleText && bubbleText.length > 0;

  return (
    <motion.div
      className={`relative flex flex-col ${side === "left" ? "items-start" : "items-end"} ${translateClass}`}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SpeechBubble
        side={side}
        className={
          side === "left"
            ? "bg-white/90 text-gray-900 border border-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
            : "bg-white/90 text-gray-900 border border-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
        }
      >
        {bubbleText}
      </SpeechBubble>

      {/* Grounded oval shadow under character */}
      <div
        className="absolute bottom-[6px] left-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
        style={{
          width: "min(40vw, 380px)",
          height: "18px",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.10) 45%, rgba(0,0,0,0) 70%)",
          filter: "blur(6px)",
          opacity: 0.55,
        }}
      />

      {/* Circular avatar frame */}
      <motion.div
        className="relative select-none pointer-events-auto rounded-full overflow-hidden ring-4 ring-white/70 shadow-xl bg-white/40 backdrop-blur-sm"
        initial={{ scale: 1 }}
        animate={speaking ? { scale: [1, 1.03, 1], y: [0, -5, 0] } : { scale: 1, y: 0 }}
        transition={speaking ? { duration: 0.9, repeat: Infinity, repeatType: "loop" } : { type: "spring", stiffness: 220 }}
        whileHover={{ scale: 1.04, rotate: side === "left" ? -1.2 : 1.2 }}
        style={{
          width: "clamp(260px, 30vw, 400px)",
          height: "clamp(260px, 30vw, 400px)",
          zIndex: 1,
        }}
      >
        {/* Inner soft vignette for depth */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
        <img
          src={imgSrc}
          alt={alt}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </motion.div>
    </motion.div>
  );
}

function SpeechBubble({ children, side, className = "" }) {
  // Tail position near the edge that faces the character
  const tailEdgeClasses =
    side === "left"
      ? "left-6 md:left-8"
      : "right-6 md:right-8";

  // Tail triangle points “down-left” or “down-right” depending on side
  const tailClipPath =
    side === "left"
      ? "polygon(0% 0%, 100% 100%, 0% 100%)"      // ◣
      : "polygon(0% 100%, 100% 0%, 100% 100%)";   // ◢

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`pointer-events-auto relative mb-3
                  max-w-[42ch] md:max-w-[52ch]
                  text-base md:text-2xl leading-snug
                  pl-7 pr-5 md:pl-8 md:pr-6 py-3.5 md:py-4
                  rounded-3xl overflow-hidden
                  bg-white/90 text-gray-900 border border-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.12)]
                  ${className}`}
      style={{ backdropFilter: "blur(8px)", fontFamily: "Arial, sans-serif" }}
    >
      {/* Accent bar (clipped by overflow-hidden) */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-2.5 ${
          side === "left" ? "bg-blue-400/70" : "bg-emerald-400/70"
        }`}
        aria-hidden="true"
      />

      {/* Text */}
      <span className="font-medium break-words whitespace-pre-wrap hyphens-auto">
        {children}
      </span>

      {/* Tail (triangle, no rotate, so no diamond) */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 ${tailEdgeClasses} h-4 w-4`}
        style={{
          background: "rgba(255,255,255,0.9)",
          clipPath: tailClipPath,
          borderLeft: "1px solid rgba(0,0,0,0.08)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          transform: "translateY(45%)", // visually hugs the bubble edge
        }}
      />
    </motion.div>
  );
}
