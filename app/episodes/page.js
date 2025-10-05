"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/* ---------- Brand mark (same as landing) ---------- */
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
        <path d="M24 52c6-2 10-6 12-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
        <circle cx="44" cy="20" r="3" fill="#fff" opacity=".9" />
      </g>
    </svg>
  );
}

/* ---------- Page data ---------- */
const SCENARIOS = [
  { id: "intro",           placeholder: "/img/intro.png",      blurb: "Greetings, small talk, and names." },
  { id: "restaurant",        placeholder: "/img/restaurant.png", blurb: "Ordering food and paying." },
  { id: "airport",                placeholder: "/img/travel.png",     blurb: "Check-in, boarding, documents." },
  { id: "directions",   placeholder: "/img/directions.png", blurb: "Asking the way and transport." },
];

const LANG_LABEL = {
  fr: "🇫🇷 Français",
  ja: "🇯🇵 日本語",
  es: "🇪🇸 Español",
  zh: "🇨🇳 中文",
};

export default function EpisodesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const lang = searchParams.get("lang");
  const [hovered, setHovered] = useState(null);

  const langLabel = useMemo(() => (lang && LANG_LABEL[lang]) || "Language not set", [lang]);

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
    visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
  };

  function handleBack() {
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#FFF8EE] text-[#1F1F1F] flex flex-col items-center justify-center px-6 py-12">
      {/* Header (matches landing) */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <LogoMark />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Choose a <span className="text-blue-600">Scenario</span>
          </h1>
        </div>
        <p className="text-base sm:text-lg text-zinc-700">
          Target language:{" "}
          <span className="px-3 py-1 rounded-full border bg-white text-base font-medium">
            {langLabel}
          </span>
        </p>
      </motion.div>

      {/* No language selected banner */}
      {!lang && (
        <div className="w-full max-w-4xl mb-6 text-[#b45309] bg-[#FFF2CC] border border-[#F6E3A1] px-4 py-2 rounded-xl">
          No language selected —{" "}
          <button className="underline" onClick={handleBack}>
            go back
          </button>{" "}
          and pick one.
        </div>
      )}

      {/* Scenario Tiles — 2x2 large squares */}
      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-14 place-items-center"
      >
        {SCENARIOS.map((s) => (
          <motion.button
            key={s.id}
            type="button"
            variants={cardVariant}
            onClick={() => lang && router.push(`/play/${s.id}?lang=${encodeURIComponent(lang)}`)}
            className="group relative overflow-hidden rounded-3xl transition-all duration-300 shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.98 }}
            disabled={!lang}
          >
            <motion.div
              className="relative aspect-square w-72 sm:w-80 md:w-96 rounded-3xl overflow-hidden"
              whileHover={{ scale: 1.08 }}
            >
              <motion.img
                src={s.placeholder}
                alt={`${s.title} art`}
                className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                draggable={false}
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="bg-black/60 rounded-2xl px-6 py-4 text-white text-xl sm:text-2xl font-bold text-center shadow-xl">
                  {s.blurb}
                </div>
              </motion.div>
            </motion.div>
          </motion.button>
        ))}
      </motion.div>

      {/* Footer controls */}
      <div className="mt-10 flex gap-3">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-full border-2 bg-white text-base sm:text-lg hover:bg-[#fff2e9] transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
