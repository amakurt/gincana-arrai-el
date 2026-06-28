"use client";

import useSWR from "swr";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { History, ArrowLeft, AlertTriangle, RefreshCw, Trash2, Search } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HistoricoPage() {
  const router = useRouter();
  const { data, mutate, error } = useSWR("/api/historico", fetcher, { refreshInterval: 3000 });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [filtro, setFiltro] = useState("");

  const filtered = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!filtro) return data;
    const f = filtro.toLowerCase();
    return data.filter((v: any) =>
      (v.teamId || '').toLowerCase().includes(f) ||
      (v.type || '').toLowerCase().includes(f) ||
      (v.provaId || '').toLowerCase().includes(f) ||
      (v.juradoName || '').toLowerCase().includes(f) ||
      (v.voterId || '').toLowerCase().includes(f) ||
      (v.jurado || '').toLowerCase().includes(f)
    );
  }, [data, filtro]);

  useEffect(() => {
    fetch("/api/auth/check")
      .then(r => r.json())
      .then(d => {
        if (d.verified) {
          setCheckingAuth(false);
        } else {
          window.location.href = "/login";
        }
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  if (checkingAuth) return null;

  const handleClear = async () => {
    await fetch("/api/historico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" })
    });
    setConfirmClear(false);
    mutate();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History /> Histórico de Votações
        </h1>
        <button onClick={() => mutate()} className="nav-btn"><RefreshCw size={16} /> Atualizar</button>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} className="nav-btn" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
            <Trash2 size={16} /> Limpar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleClear} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Confirmar</button>
            <button onClick={() => setConfirmClear(false)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid var(--warm-wood-border)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Filtrar por equipe, prova, jurado..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem 1rem 0.8rem 2.5rem',
            borderRadius: '10px',
            border: '1px solid var(--warm-wood-border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} /> Erro ao carregar histórico.
        </div>
      )}

      {!Array.isArray(data) ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {filtro ? 'Nenhum voto encontrado para este filtro.' : 'Nenhum voto registrado ainda.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--warm-wood-border)', color: 'var(--text-secondary)' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Data/Hora</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Prova</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Equipe</th>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Votante</th>
                <th style={{ textAlign: 'center', padding: '0.6rem 0.8rem' }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((voto: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0.8rem', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {new Date(voto.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '0.5rem 0.8rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: voto.type === 'jury' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                      color: voto.type === 'jury' ? '#f59e0b' : '#3b82f6'
                    }}>
                      {voto.type === 'jury' ? 'Júri' : 'Público'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.8rem' }}>{voto.provaId}</td>
                  <td style={{ padding: '0.5rem 0.8rem' }}>{voto.teamId}</td>
                  <td style={{ padding: '0.5rem 0.8rem' }}>
                    {voto.type === 'jury'
                      ? (voto.juradoName || voto.jurado || '—')
                      : (voto.voterId && voto.voterId !== 'anon' ? `Votante ${voto.voterId.slice(0, 6)}...` : 'Anônimo')
                    }
                  </td>
                  <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center', fontWeight: 700 }}>
                    {voto.type === 'jury' ? voto.score : '✓'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Array.isArray(data) && (
        <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
          Total: {data.length} voto{data.length !== 1 ? 's' : ''}
          {filtro && filtered.length !== data.length && ` (${filtered.length} filtrados)`}
        </div>
      )}

      <style>{`
        .nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.4);
          border: 1px solid var(--warm-wood-border);
          padding: 0.5rem 1rem;
          border-radius: 10px;
          color: var(--text-primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
          outline: none;
        }
        .nav-btn:hover {
          background: rgba(255,255,255,0.7);
          transform: translateY(-1px);
        }
        .nav-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
