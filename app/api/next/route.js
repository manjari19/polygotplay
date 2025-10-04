import path from "path";
import { promises as fs } from "fs";
import { knobs } from "../../../lib/difficulty.js";

export const dynamic = "force-dynamic";

async function loadEpisode(episodeId) {
  const file = path.join(process.cwd(), "content/episodes", `${episodeId}.json`);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

export async function POST(req) {
  try {
    const { episodeId = "ep_intro", nodeId = "n0", targetLang = "fr", userStats = { difficulty: "A1" } } = await req.json();
    const ep = await loadEpisode(episodeId);
    const node = ep.nodes.find(n => n.id === nodeId) || ep.nodes[0];
    const k = knobs(userStats.difficulty);

    const payload = {
      narrator: { en: node.lines.en, target: node.lines[targetLang] || node.lines.en },
      coachTip: "Try repeating the key phrase.",
      nextNodeId: node.next_success || "end",
      adjustments: k
    };
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
