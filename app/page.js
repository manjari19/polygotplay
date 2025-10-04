"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/* --- Minimal, sleek SVG logo (no emoji) --- */
function LogoMark({ className = "h-12 w-12" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ppg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feBlend in="SourceGraphic" in2="b" mode="normal" />
        </filter>
      </defs>
      <g filter="url(#soft)">
        <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#ppg)" />
        <path
          d="M24 52c6-2 10-6 12-12"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity=".5"
        />
        <circle cx="44" cy="20" r="3" fill="#fff" opacity=".9" />
      </g>
    </svg>
  );
}

export default function Home() {
  const [selectedLang, setSelectedLang] = useState(null);
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const LANGUAGES = [
    { code: "fr", placeholder: "/img/fr.png" },
    { code: "ja", placeholder: "/img/ja.png" },
    { code: "es", placeholder: "/img/es.png" },
    { code: "zh", placeholder: "/img/zh.png" },
  ];

  const handleContinue = () => {
    if (selectedLang) router.push(`/episodes?lang=${selectedLang}`);
  };

  // Animation presets
  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const gridStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const cardVariant = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.1, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-[#FFF8EE] text-[#1F1F1F] flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center mb-12"
      >
        <div className="flex items-center gap-3 mb-2">
          <LogoMark />
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
            Polyglot<span className="text-blue-600">Play</span>
          </h1>
        </div>
        <p className="text-lg sm:text-xl text-zinc-700">
          Learn through play, one story at a time.
        </p>
      </motion.div>

      {/* Language Tiles (2x2 grid, large 1:1 squares) */}
      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-14 place-items-center"
      >
        {LANGUAGES.map((lang) => (
          <motion.button
            key={lang.code}
            type="button"
            variants={cardVariant}
            onClick={() => router.push(`/episodes?lang=${lang.code}`)}
            className={`group relative overflow-hidden rounded-3xl transition-all duration-300 shadow-xl
              focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300`}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative aspect-square w-72 sm:w-80 md:w-96 rounded-3xl overflow-hidden">
              {/* soft glow */}
              <div
                className={`absolute inset-0 rounded-3xl transition-all
                  group-hover:ring-8 group-hover:ring-orange-50`}
              />
              <img
                src={lang.placeholder}
                alt={`${lang.code} language`}
                className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-lg"
                draggable={false}
              />
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Continue Button */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={selectedLang ? "visible" : "hidden"}
        className="flex justify-center"
      >
        {selectedLang && (
          <button
            onClick={handleContinue}
            className="mt-12 px-10 py-4 rounded-full bg-[#FF7F5C] text-white text-xl font-semibold shadow-md
                       hover:bg-[#e96d4f] active:translate-y-[1px] transition"
          >
            Continue →
          </button>
        )}
      </motion.div>
    </div>
  );
}
