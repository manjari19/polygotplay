"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const [selectedLang, setSelectedLang] = useState(null);
  const router = useRouter();

  const LANGUAGES = [
    { code: "fr", label: "🇫🇷 Français", placeholder: "/placeholder-fr.png" },
    { code: "ja", label: "🇯🇵 日本語", placeholder: "/placeholder-ja.png" },
    { code: "es", label: "🇪🇸 Español", placeholder: "/placeholder-es.png" },
    { code: "zh", label: "🇨🇳 中文", placeholder: "/placeholder-zh.png" },
  ];

  const handleContinue = () => {
    if (selectedLang) {
      router.push(`/episodes?lang=${selectedLang}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF8EE] text-[#1F1F1F]">
      {/* Title */}
      <motion.h1
        className="text-5xl md:text-6xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        🌍 PolyglotPlay
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="text-2xl md:text-3xl text-center mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Learn through play, one story at a time.
      </motion.p>

      {/* Language Cards */}
      <div className="grid grid-cols-2 gap-6 md:gap-8">
        {LANGUAGES.map((lang) => (
          <motion.div
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={`cursor-pointer p-6 md:p-10 rounded-2xl text-center text-2xl md:text-3xl font-medium border-2 transition ${
              selectedLang === lang.code
                ? "bg-[#E8FFF4] border-[#FF7F5C] scale-105"
                : "bg-white border-[#E8FFF4] hover:scale-105"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={lang.placeholder}
              alt={`${lang.label} placeholder`}
              className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4"
            />
            {lang.label}
          </motion.div>
        ))}
      </div>

      {/* Continue Button */}
      {selectedLang && (
        <motion.button
          onClick={handleContinue}
          className="mt-10 px-8 py-4 rounded-full bg-[#FF7F5C] text-white text-2xl font-semibold shadow-md hover:bg-[#e96d4f] transition"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}