import Link from "next/link";
import { MonitorPlay, Smartphone, Lock, ArrowRight } from "lucide-react";
import ShareButton from "@/components/ShareButton";

export default function Home() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem 2.5rem', marginBottom: '3rem' }}>
        <img src="/logologos.png" alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 14, background: 'var(--logo-bg)', padding: 6, outline: '1px solid var(--logo-ring)' }} />
        <div>
          <h1 style={{ textAlign: 'center', margin: 0, fontSize: '3.5rem', color: 'var(--blue-brazil)', lineHeight: 1 }}>Arrai-el</h1>
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>2026</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '600px' }}>
        
        <Link 
          href="/screen" 
          className="glass glass-card-link"
          style={{ 
            padding: '2rem 2.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--blue-brazil)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MonitorPlay size={28} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Telão</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Placar em tempo real para o público</p>
          </div>
          <ArrowRight size={20} color="var(--blue-brazil)" style={{ opacity: 0.4 }} />
        </Link>
        
        <Link 
          href="/vote" 
          className="glass glass-card-link"
          style={{ 
            padding: '2rem 2.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--grass-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Smartphone size={28} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Votar</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Votação do público pelo celular</p>
          </div>
          <ArrowRight size={20} color="var(--grass-dark)" style={{ opacity: 0.4 }} />
        </Link>
        
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
        <ShareButton url="/" label="Compartilhar Evento" />
        <Link 
          href="/login" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--text-secondary)', 
            fontWeight: 600, 
            fontSize: '0.9rem', 
            padding: '0.6rem 1.2rem', 
            borderRadius: '20px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-light)', 
            transition: 'all 0.2s' 
          }}
        >
          <Lock size={14} color="var(--blue-brazil)" />
          <span>Área Restrita</span>
        </Link>
      </div>
    </div>
  );
}
