import Link from "next/link";
import { MonitorPlay, Smartphone, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
        <img src="/logologos.png" alt="Logo" style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 20, background: 'rgba(255,255,255,0.08)', padding: 10, boxShadow: '0 0 30px rgba(255,255,255,0.2)' }} />
        <h1 className="gradient-text" style={{ textAlign: 'center', margin: 0, fontSize: '5rem' }}>Arrai-el<br/><span style={{ fontSize: '2rem', color: 'var(--glow-yellow)' }}>2026</span></h1>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '800px' }}>
        
        <Link href="/screen" className="glass" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <MonitorPlay size={64} color="#3b82f6" />
          <h2>Telão</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Placar em tempo real para o público.</p>
        </Link>
        
        <Link href="/vote" className="glass" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <Smartphone size={64} color="#10b981" />
          <h2>Votar (Alunos)</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Interface mobile para votação.</p>
        </Link>
        
      </div>

      <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center' }}>
        <Link 
          href="/login" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--text-secondary)', 
            fontWeight: 'bold', 
            fontSize: '1rem', 
            padding: '0.8rem 1.5rem', 
            borderRadius: '30px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-light)', 
            transition: 'all 0.2s' 
          }}
        >
          <Lock size={16} color="var(--glow-yellow)" />
          <span>Área Restrita</span>
        </Link>
      </div>
    </div>
  );
}
