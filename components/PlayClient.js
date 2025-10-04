"use client";
import { useEffect, useState } from "react";

export default function PlayClient({ episodeId }) {
  const [target, setTarget] = useState("fr");
  const [nodeId, setNodeId] = useState("n0");
  const [lines, setLines] = useState({ en: "", target: "" });
  const [coach, setCoach] = useState("");
  const [loading, setLoading] = useState(false);

  async function nextStep() {
    setLoading(true);
    const res = await fetch("/api/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeId,     // ✅ plain prop, no params warning
        nodeId,
        targetLang: target,
        userStats: { difficulty: "A1" }
      })
    });
    const data = await res.json();
    setLines({ en: data.narrator?.en || "", target: data.narrator?.target || "" });
    setCoach(data.coachTip || "");
    setNodeId(data.nextNodeId || "end");
    setLoading(false);
  }

  useEffect(() => { nextStep(); }, []);

  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:24}}>
      <header style={{display:"flex",gap:12,alignItems:"center"}}>
        <select value={target} onChange={e=>setTarget(e.target.value)}>
          <option value="fr">French</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="es">Spanish</option>
        </select>
        <span style={{background:"#f3f4f6",padding:"4px 8px",borderRadius:8}}>Node: {nodeId}</span>
      </header>

      <div style={{background:"#fff",border:"1px solid #eee",borderRadius:16,padding:16,marginTop:16}}>
        <p style={{fontSize:20,fontWeight:600}}>{lines.target}</p>
        <p style={{color:"#6b7280",marginTop:8}}>{lines.en}</p>
      </div>

      {coach && <div style={{color:"#047857",marginTop:8}}>💡 {coach}</div>}

      <div style={{display:"flex",gap:12,marginTop:12}}>
        <button disabled={loading} onClick={nextStep} style={{padding:"10px 16px",borderRadius:12,background:"#374151",color:"#fff"}}>
          {loading ? "Loading…" : "Next"}
        </button>
      </div>
    </div>
  );
}
