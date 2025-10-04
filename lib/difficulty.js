export function knobs(level = "A1") {
    if (level === "A1") return { sentenceLength: "short", hintLevel: "high", ttsRate: 0.92 };
    if (level === "A2") return { sentenceLength: "medium", hintLevel: "med",  ttsRate: 1.0  };
    return { sentenceLength: "long",  hintLevel: "low",  ttsRate: 1.07 };
  }
  