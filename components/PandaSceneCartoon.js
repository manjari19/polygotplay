"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";

/**
 * PolyglotPlay – Panda Scene UI (Cartoon Prototype)
 * --------------------------------------------------
 * Single-file React mock that visualizes a cartoon scene with a talking panda.
 * No backend; swap in your existing handlers later.
 * - Language chips (FR / 中文 / 日本語 / ES)
 * - Episode tabs (Intro / Restaurant / Airport / Directions)
 * - Big cartoon stage with a panda SVG and speech bubble
 * - Play / Speak buttons, type fallback, demo toggle
 * - Difficulty + hints + mastery stars
 * TailwindCSS + Framer Motion recommended.
 */

const LANGS = [
  { id: "fr", label: "French", chip: "FR" },
  { id: "zh", label: "Chinese", chip: "中文" },
  { id: "ja", label: "Japanese", chip: "日本語" },
  { id: "es", label: "Spanish", chip: "ES" },
];

const EPISODES = [
  { id: "intro", label: "👋 Intro" },
  { id: "restaurant", label: "🍜 Restaurant" },
  { id: "airport", label: "🛫 Airport" },
  { id: "directions", label: "🗺️ Directions" },
];

const LINES = {
  fr: [
    { en: "Welcome! I'm Poko the panda.", target: "Bienvenue ! Je suis Poko le panda.", tip: "Say 'Bonjour' to start." },
    { en: "What would you like to order?", target: "Que désirez-vous ?", tip: "Try: Un café, s'il vous plaît." },
    { en: "Show your passport, please.", target: "Votre passeport, s'il vous plaît.", tip: "Answer: Le voici !" },
    { en: "Which way to the museum?", target: "C'est par où le musée ?", tip: "Ask politely." },
  ],
  zh: [
    { en: "Welcome! I'm Poko the panda.", target: "欢迎！我是熊猫 Poko。", tip: "说：你好 (nǐ hǎo)。" },
    { en: "What would you like to order?", target: "您想点什么？", tip: "试试：一杯咖啡，谢谢。" },
    { en: "Passport, please.", target: "请出示护照。", tip: "回答：在这儿。" },
    { en: "How do I get to the museum?", target: "去博物馆怎么走？", tip: "加上'请'会更礼貌。" },
  ],
  ja: [
    { en: "Welcome! I'm Poko the panda.", target: "ようこそ！パンダのポコだよ。", tip: "『こんにちは』と言ってみて。" },
    { en: "What would you like to order?", target: "ご注文は何になさいますか？", tip: "『水をお願いします』でもOK。" },
    { en: "Passport, please.", target: "パスポートを見せてください。", tip: "『はい、どうぞ』で返答。" },
    { en: "Which way is the museum?", target: "美術館はどちらですか？", tip: "丁寧語でいこう。" },
  ],
  es: [
    { en: "Welcome! I'm Poko the panda.", target: "¡Bienvenid@! Soy Poko el panda.", tip: "Di: ¡Hola!" },
    { en: "What would you like to order?", target: "¿Qué te gustaría pedir?", tip: "Prueba: Un café, por favor." },
    { en: "Passport, please.", target: "Pasaporte, por favor.", tip: "Responde: Aquí está." },
    { en: "How do I get to the museum?", target: "¿Cómo llego al museo?", tip: "Sé amable y claro." },
  ],
};

export default function PandaSceneCartoon() {
  const [lang, setLang] = useState("fr");
  const [ep, setEp] = useState(0); // 0..3 map to the 4 templates
  const [difficulty, setDifficulty] = useState("A1");
  const [hintLevel, setHintLevel] = useState("high");
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState("");

  const { en, target, tip } = LINES[lang][ep];

  return (
    <div className="min-h-screen bg-[#fff8ee] text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-black text-white grid place-items-center font-bold">P</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">PolyglotPlay</div>
              <div className="font-semibold">Panda Story Mode</div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  lang === l.id ? "bg-black text-white border-black" : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                }`}
                aria-pressed={lang === l.id}
              >
                {l.chip}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: Episodes & status */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl border bg-white shadow-sm p-4">
            <h2 className="font-semibold mb-3">Episodes</h2>
            <div className="grid grid-cols-2 gap-2">
              {EPISODES.map((e, idx) => (
                <button
                  key={e.id}
                  onClick={() => setEp(idx)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    ep === idx ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                  aria-pressed={ep === idx}
                >
                  <div className="text-lg">{e.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="px-2 py-1 rounded-full bg-slate-100">Difficulty: {difficulty}</span>
              <span className="px-2 py-1 rounded-full bg-slate-100">Hints: {hintLevel}</span>
              <span className="text-yellow-500">★ ★ ☆</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1.5 rounded-full border text-sm" onClick={() => setDifficulty((d) => (d === "A1" ? "A2" : d === "A2" ? "B1" : "A1"))}>Cycle Difficulty</button>
              <button className="px-3 py-1.5 rounded-full border text-sm" onClick={() => setHintLevel((h) => (h === "high" ? "med" : h === "med" ? "low" : "high"))}>Cycle Hints</button>
            </div>
          </div>

          <div className="rounded-3xl border bg-white shadow-sm p-4">
            <h3 className="font-semibold mb-2">Coach Tips</h3>
            <p className="text-sm text-slate-600">{tip}</p>
          </div>
        </aside>

        {/* Stage: Cartoon panda scene */}
        <section className="lg:col-span-2">
          <div className="rounded-3xl border bg-white shadow-sm p-4 md:p-6">
            {/* Cartoon stage */}
            <div className="relative rounded-3xl overflow-hidden border mb-4" style={{background: "linear-gradient(180deg,#bde5ff 0%, #e8f7ff 60%, #b7f0c4 60%, #8ddf9c 100%)"}}>
              {/* Hills & trees */}
              <svg viewBox="0 0 900 420" className="w-full h-[260px] md:h-[300px]">
                <defs>
                  <clipPath id="roundStage"><rect x="0" y="0" width="900" height="420" rx="28" ry="28"/></clipPath>
                </defs>
                <g clipPath="url(#roundStage)">
                  {/* distant hills */}
                  <path d="M0 260 C200 180, 300 220, 450 200 C600 180, 700 230, 900 190 L900 420 L0 420 Z" fill="#a7e3b4"/>
                  <path d="M0 290 C180 240, 300 280, 470 260 C640 240, 760 300, 900 270 L900 420 L0 420 Z" fill="#7fd88f"/>
                  {/* path */}
                  <path d="M200 420 C260 340, 420 330, 520 300 C650 260, 740 250, 900 260 L900 420 Z" fill="#e9c69a"/>

                  {/* simple trees */}
                  {[120, 210, 680, 770].map((x, i) => (
                    <g key={i}>
                      <rect x={x-5} y={250} width={10} height={40} fill="#7e4b2a"/>
                      <circle cx={x} cy={240} r={24} fill="#4fb069"/>
                    </g>
                  ))}

                  {/* Panda */}
                  <g transform="translate(560,160) scale(1.05)">
                    {/* body */}
                    <ellipse cx="120" cy="150" rx="85" ry="100" fill="#111"/>
                    <ellipse cx="120" cy="150" rx="65" ry="80" fill="#fff"/>
                    {/* head */}
                    <circle cx="120" cy="90" r="60" fill="#fff"/>
                    <circle cx="90" cy="60" r="18" fill="#111"/>
                    <circle cx="150" cy="60" r="18" fill="#111"/>
                    {/* ears */}
                    <circle cx="90" cy="35" r="16" fill="#111"/>
                    <circle cx="150" cy="35" r="16" fill="#111"/>
                    {/* eye patches */}
                    <ellipse cx="100" cy="80" rx="14" ry="18" fill="#111"/>
                    <ellipse cx="140" cy="80" rx="14" ry="18" fill="#111"/>
                    {/* eyes */}
                    <circle cx="100" cy="80" r="6" fill="#fff"/>
                    <circle cx="140" cy="80" r="6" fill="#fff"/>
                    {/* nose & mouth */}
                    <path d="M120 92 q8 8 0 16 q-8 -8 0 -16" fill="#111"/>
                    <path d="M110 112 q10 12 20 0" stroke="#111" strokeWidth="3" fill="none"/>
                    {/* arm wave */}
                    <path d="M55 155 q-30 -15 -20 -40 q25 -8 40 10" fill="#111"/>
                  </g>

                  {/* Speech bubble */}
                  <g>
                    <foreignObject x="60" y="40" width="460" height="140">
                      <div className="rounded-3xl bg-white shadow-lg border px-4 py-3 text-[15px] leading-snug">
                        <div className="font-semibold">{en}</div>
                        <div className="text-slate-700 mt-0.5">{target}</div>
                      </div>
                    </foreignObject>
                    <path d="M520 140 l-30 14 l14 -34 z" fill="#fff" stroke="#e5e7eb"/>
                  </g>
                </g>
              </svg>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <motion.button whileTap={{ scale: 0.98 }} className="px-5 py-2.5 rounded-2xl bg-[#2563eb] text-white">▶ Play</motion.button>
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setListening((s)=>!s)} className={`px-5 py-2.5 rounded-2xl border relative overflow-hidden ${listening?"border-rose-300 bg-rose-50":"border-slate-200 bg-white"}`}>
                <span className="relative z-10">{listening?"🎙️ Listening…":"🎤 Speak"}</span>
                {listening && <span className="absolute inset-0 rounded-2xl animate-ping bg-rose-200/50" aria-hidden/>}
              </motion.button>
              <input className="flex-1 min-w-[220px] border rounded-2xl px-4 py-2" placeholder="Noisy room? Type your reply here…" value={typed} onChange={(e)=>setTyped(e.target.value)} />
              <button className="px-4 py-2 rounded-2xl border">Send</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-sm text-slate-500">Cartoon prototype • swap in your real /api/next and /api/tts later • mobile-friendly</footer>
    </div>
  );
}
