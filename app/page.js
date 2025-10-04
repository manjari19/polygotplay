export default function Home() {
  return (
    <main style={{maxWidth:720,margin:"0 auto",padding:24}}>
      <h1 style={{fontSize:28,fontWeight:700}}>PolyglotPlay</h1>
      <p>Click below to start the Intro episode.</p>
      <a href="/play/ep_intro" style={{display:"inline-block",marginTop:12,padding:"10px 16px",background:"#4f46e5",color:"#fff",borderRadius:12}}>Play Intro</a>
    </main>
  );
}
