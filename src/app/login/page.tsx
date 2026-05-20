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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        router.push('/admin');
      } else {
        setError(result.error || 'Credenciais inválidas! Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
      <form onSubmit={handleLogin} className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--team-d)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--team-d)' }}>
            <Lock size={40} color="var(--team-d)" />
          </div>
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Área restrita aos organizadores. Faça login para acessar o Painel Administrativo:</p>

        {/* Campo Usuário */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
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
              background: 'var(--bg-dark)',
              color: 'white',
              border: '1px solid var(--border-light)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            required
            autoFocus
          />
        </div>

        {/* Campo Senha */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Lock size={20} />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 3rem 1rem 3rem',
              borderRadius: '12px',
              fontSize: '1.1rem',
              background: 'var(--bg-dark)',
              color: 'white',
              border: '1px solid var(--border-light)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
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
