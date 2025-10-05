"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const SCENARIOS = [
	{
		id: "intro",
		placeholder: "/img/intro.png",
		blurb: "Greetings, small talk, and names.",
	},
	{
		id: "restaurant",
		placeholder: "/img/restaurant.png",
		blurb: "Ordering food and paying.",
	},
	{
		id: "airport",
		placeholder: "/img/travel.png",
		blurb: "Check-in, boarding, documents.",
	},
	{
		id: "directions",
		placeholder: "/img/directions.png",
		blurb: "Asking the way and transport.",
	},
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
	const lang = searchParams.get("lang");
	const [selectedScenario, setSelectedScenario] = useState(null);

	const langLabel = useMemo(
		() => (lang && LANG_LABEL[lang]) || "Language not set",
		[lang]
	);

	const handleBack = () => {
		router.push("/");
	};

	return (
		<div className="min-h-screen h-screen flex flex-col items-center justify-center bg-[#FFF8EE] text-[#1F1F1F]">
			{/* Title & Subtitle */}
			<div className="flex flex-col items-center justify-center flex-shrink-0">
				<motion.h1
					className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
						🐼 Choose a Scenario
				</motion.h1>
				<motion.p
					className="text-lg sm:text-xl md:text-2xl text-center mb-4"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
				>
					Target language:{" "}
					<span className="px-3 py-1 rounded-full border bg-white text-base md:text-lg font-medium">
						{langLabel}
					</span>
				</motion.p>
			</div>

			{/* Warning if no lang */}
			{!lang && (
				<div className="w-full max-w-5xl mb-2 text-[#b45309] bg-[#FFF2CC] border border-[#F6E3A1] px-4 py-2 rounded-xl">
					No language selected —{" "}
					<button className="underline" onClick={handleBack}>
						go back
					</button>{" "}
					and pick one.
				</div>
			)}

			{/* Scenario Tiles (responsive grid, fit viewport, home page style) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-14 place-items-center w-full max-w-3xl flex-1">
				{SCENARIOS.map((s) => (
					<motion.button
						key={s.id}
						type="button"
						onClick={() =>
							lang &&
							router.push(`/play/${s.id}?lang=${encodeURIComponent(lang)}`)
						}
						className={`group relative overflow-hidden rounded-3xl transition-all duration-300 flex flex-col items-center justify-center aspect-square w-full h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300`}
						whileHover={{ scale: 1.03 }}
						whileTap={{ scale: 0.97 }}
						disabled={!lang}
					>
						<div className="relative aspect-square w-72 sm:w-80 md:w-96 rounded-3xl overflow-hidden">
							<img
								src={s.placeholder}
								alt={s.id + " art"}
								className="absolute inset-0 w-full h-full object-cover object-top rounded-3xl shadow-lg"
								draggable={false}
							/>
						</div>
						<p className="relative z-10 text-lg md:text-xl text-zinc-700 text-center px-4 drop-shadow-lg bg-white/80 rounded-xl py-2 mt-2 w-full">
							{s.blurb}
						</p>
					</motion.button>
				))}
			</div>

			{/* Back Button only */}
			<div className="flex flex-row gap-4 mt-2 mb-2">
				<button
					onClick={handleBack}
					className="px-6 py-3 rounded-full border-2 bg-white text-base md:text-lg hover:bg-[#fff2e9] transition"
				>
					← Back
				</button>
			</div>
		</div>
	);
}
