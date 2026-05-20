import Link from "next/link";
import { MonitorPlay, Smartphone, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 className="gradient-text" style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '5rem' }}>Arrai-el<br/><span style={{ fontSize: '2rem', color: 'var(--glow-yellow)' }}>2026</span></h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px' }}>
        
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

        <Link href="/admin" className="glass" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <Settings size={64} color="#f59e0b" />
          <h2>Painel Admin</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Controle de provas e zerar placar.</p>
        </Link>

        <Link href="/jurado" className="glass" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <Settings size={64} color="#8b5cf6" />
          <h2>Painel dos Jurados</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Área restrita para lançamento de notas.</p>
        </Link>
        
      </div>
    </div>
  );
}
