"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [displayError, setDisplayError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('error=1')) {
      setDisplayError('Credenciais inválidas! Tente novamente.');
    }
  }, []);

  return (
    <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
      <form action="/api/auth/login" method="POST" className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--team-d)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <img src="/logologos.png" alt="Logo" style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 16, background: 'var(--logo-bg)', padding: 8, outline: '1px solid var(--logo-ring)' }} />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Área restrita aos organizadores. Faça login para acessar o Painel Administrativo:</p>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', zIndex: 1 }}>
            <User size={20} />
          </div>
          <input
            type="text"
            name="username"
            placeholder="Usuário (Ex: admin)"
            defaultValue=""
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              borderRadius: '12px',
              fontSize: '1.1rem',
              background: 'rgba(255,255,255,0.5)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)'
            }}
            required
            autoFocus
          />
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', zIndex: 1, pointerEvents: 'none' }}>
            <Lock size={20} />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Senha"
            defaultValue=""
            style={{
              width: '100%',
              padding: '1rem 3.2rem 1rem 3rem',
              borderRadius: '12px',
              fontSize: '1.1rem',
              background: 'rgba(255,255,255,0.5)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)'
            }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={0}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 8
            }}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {displayError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', justifyContent: 'center', fontSize: '0.9rem' }}>
            <ShieldAlert size={16} />
            <span>{displayError}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn"
          style={{ background: 'var(--team-d)', fontWeight: 'bold', marginTop: '0.5rem' }}
        >
          ENTRAR NO PAINEL
        </button>

        <button
          type="button"
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem', fontWeight: 'bold' }}
        >
          Voltar para Início
        </button>
      </form>
    </div>
  );
}
