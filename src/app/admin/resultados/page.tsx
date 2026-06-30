"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Trophy, ArrowLeft, AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ResultadosPage() {
  const router = useRouter();
  const { data, mutate, error } = useSWR("/api/resultados", fetcher, { refreshInterval: 5000 });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

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

  if (error) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "5rem" }}>
        <AlertTriangle size={48} style={{ color: "#ef4444", margin: "0 auto 1rem" }} />
        <h2 style={{ color: "#ef4444" }}>Erro ao carregar resultados</h2>
      </div>
    );
  }

  const resultados = data || [];

  return (
    <div className="container" style={{ maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={() => router.push("/admin")}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-light)",
            borderRadius: "12px", padding: "0.6rem", color: "var(--text-secondary)",
            cursor: "pointer", display: "flex"
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: "2rem", color: "var(--blue-brazil)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart3 size={28} /> Resultados
        </h1>
        <button onClick={() => mutate()} className="nav-btn" style={{ marginLeft: "auto" }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {resultados.length === 0 ? (
        <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <Trophy size={48} style={{ color: "var(--yellow-brazil)", opacity: 0.4, margin: "0 auto 1rem" }} />
          <h3 style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Nenhum resultado registrado</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Os resultados aparecerão automaticamente quando você parar a votação de uma prova.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {[...resultados].reverse().map((prova: any) => {
            const sorted = [...(prova.teams || [])].sort((a: any, b: any) => b.total - a.total);
            return (
              <div key={prova.provaId} className="glass" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", color: "var(--blue-brazil)" }}>
                    <Trophy size={20} style={{ verticalAlign: "middle", marginRight: "0.4rem" }} />
                    {prova.provaName}
                  </h2>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {new Date(prova.backupDate).toLocaleString("pt-BR")}
                  </span>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-light)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.5rem" }}>#</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.5rem" }}>Equipe</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.5rem" }}>Votos</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.5rem" }}>Público</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.5rem" }}>Júri 1</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.5rem" }}>Júri 2</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.5rem" }}>Júri 3</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.5rem", fontWeight: 900, color: "var(--text-primary)" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((team: any, i: number) => (
                      <tr key={team.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "0.7rem 0.5rem", fontWeight: 800, color: i < 3 ? "var(--team-d)" : "var(--text-secondary)", fontSize: "1.1rem" }}>
                          {i + 1}º
                        </td>
                        <td style={{ padding: "0.7rem 0.5rem", fontWeight: 700, color: team.color }}>
                          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: team.color, marginRight: "0.5rem", verticalAlign: "middle" }} />
                          {team.name}
                        </td>
                        <td style={{ textAlign: "center", padding: "0.7rem 0.5rem" }}>{team.publicVotes}</td>
                        <td style={{ textAlign: "center", padding: "0.7rem 0.5rem" }}>{team.publicScore}</td>
                        <td style={{ textAlign: "center", padding: "0.7rem 0.5rem" }}>{team.j1}</td>
                        <td style={{ textAlign: "center", padding: "0.7rem 0.5rem" }}>{team.j2}</td>
                        <td style={{ textAlign: "center", padding: "0.7rem 0.5rem" }}>{team.j3 || 0}</td>
                        <td style={{ textAlign: "center", padding: "0.7rem 0.5rem", fontWeight: 900, fontSize: "1.2rem", color: "var(--text-primary)" }}>
                          {team.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {resultados.length > 0 && (
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          {confirmClear ? (
            <div className="glass" style={{ padding: "1.5rem", display: "inline-flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>Limpar todos os resultados?</span>
              <button onClick={async () => { await fetch("/api/resultados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear" }) }); setConfirmClear(false); mutate(); }} className="btn" style={{ background: "#ef4444", width: "auto", padding: "0.5rem 1.5rem", fontSize: "0.9rem" }}>
                Sim, limpar
              </button>
              <button onClick={() => setConfirmClear(false)} className="btn" style={{ background: "var(--bg-card)", color: "var(--text-primary)", width: "auto", padding: "0.5rem 1.5rem", fontSize: "0.9rem", border: "1px solid var(--border-light)" }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "0.6rem 1.5rem", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
              <Trash2 size={16} /> Limpar histórico
            </button>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.4); border: 1px solid var(--warm-wood-border);
          padding: 0.5rem 1rem; border-radius: 10px; color: var(--text-primary);
          font-weight: 600; cursor: pointer; font-size: 0.9rem;
          font-family: inherit; outline: none;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.7); }
      `}} />
    </div>
  );
}
