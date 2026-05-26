"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let loggedIn = false;
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('admin_verified', 'true');
        sessionStorage.setItem('jurado_verified', 'true');
        loggedIn = true;
        router.replace('/admin');
      } else {
        setError(result.error || 'Credenciais inválidas! Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao comunicar com o servidor.');
    } finally {
      if (!loggedIn) setLoading(false);
    }
  };

  return (
    <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
      <form onSubmit={handleLogin} className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--team-d)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <img src="/logologos.png" alt="Logo" style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 16, background: 'var(--logo-bg)', padding: 8, outline: '1px solid var(--logo-ring)' }} />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Área restrita aos organizadores. Faça login para acessar o Painel Administrativo:</p>

        {/* Campo Usuário */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', zIndex: 1 }}>
            <User size={20} />
          </div>
          <input
            type="text"
            placeholder="Usuário (Ex: admin)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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

        {/* Campo Senha */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', zIndex: 1, pointerEvents: 'none' }}>
            <Lock size={20} />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', justifyContent: 'center', fontSize: '0.9rem' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn"
          style={{ background: 'var(--team-d)', fontWeight: 'bold', marginTop: '0.5rem' }}
          disabled={loading}
        >
          {loading ? 'VERIFICANDO...' : 'ENTRAR NO PAINEL'}
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
