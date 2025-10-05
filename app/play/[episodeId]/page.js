"use client";

import { useState, useEffect, useRef } from "react";
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
  const { episodeId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang");

  // Demo text so you can see bubbles
  const [turns] = useState([
    { role: "assistant", text: "Bonjour ! Bienvenue à Paris." },
    { role: "user", text: "Salut ! Content d'être ici." },
  ]);

  const BACKGROUNDS = {
    fr: "/img/france.png",
    ja: "/img/japan.png",
    es: "/img/spain.png",
    zh: "/img/china.png",
  };

  const assistantText =
    turns.find((t) => t.role === "assistant")?.text || "Hello!";
  const userText = turns.find((t) => t.role === "user")?.text || "Hi there!";

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

  // Keypress handler for 'r' to record
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "r" && !recording) {
        setRecording(true);
        startRecording();
      }
    }
    function onKeyUp(e) {
      if (e.key === "r" && recording) {
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
  }, [recording]);

  async function startRecording() {
    if (!navigator.mediaDevices) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioURL(URL.createObjectURL(audioBlob));
    };
    mediaRecorder.start();
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
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
        className="fixed left-4 top-4 z-50 px-4 py-2 rounded-full border bg-white/80 backdrop-blur-sm text-sm font-medium shadow-sm hover:bg-white transition"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        ← Back
      </motion.button>

      {/* Updated Title */}
      <motion.h1
        className="mt-16 text-3xl md:text-4xl font-bold text-center bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-sm"
        style={{ fontFamily: 'Arial, sans-serif' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {heading}
      </motion.h1>

      {/* Recording status */}
      <div className="mt-4 text-lg font-semibold text-center">
        {recording ? "Recording..." : audioURL ? "Recording finished!" : "Hold 'r' to record"}
      </div>
      {audioURL && (
        <audio controls src={audioURL} className="mt-2" />
      )}

      {/* Characters row (anchored low on screen) */}
      <div className="pointer-events-none absolute bottom-6 md:bottom-12 left-0 right-0 w-full flex items-end justify-between px-[10%]">
        {/* Panda (assistant, left) */}
        <CharacterWithBubble
          side="left"
          imgSrc="/img/panda.png"
          alt="Panda character"
          bubbleText={assistantText}
        />

        {/* Llama (user, right) */}
        <CharacterWithBubble
          side="right"
          imgSrc="/img/llama.png"
          alt="Llama character"
          bubbleText={userText}
        />
      </div>
    </div>
  );
}

/* ========== Components ========== */

function CharacterWithBubble({ side, imgSrc, alt, bubbleText }) {
  const translateClass =
    side === "left" ? "translate-x-[-4%]" : "translate-x-[4%]";
  const bubbleColor =
    side === "left"
      ? "bg-blue-100 text-blue-900 border-blue-200"
      : "bg-gray-100 text-gray-900 border-gray-200";

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
        whileHover={{ scale: 1.04, rotate: side === "left" ? -1.5 : 1.5 }}
        transition={{ type: "spring", stiffness: 200 }}
        style={{
          width: "clamp(240px, 28vw, 340px)",
          height: "clamp(240px, 28vw, 340px)",
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
      className={`pointer-events-auto relative mb-6 max-w-2xl text-2xl md:text-3xl leading-snug px-10 py-8 rounded-3xl shadow-2xl bg-white/10 ${className}`}
      style={{
        backdropFilter: "blur(2px)",
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {children}
      <span
        className={`absolute -bottom-2 h-6 w-6 bg-inherit ${tailSide}`}
        style={{
          backgroundClip: "padding-box",
        }}
      />
    </motion.div>
  );
}
