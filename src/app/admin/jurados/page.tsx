"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { ShieldAlert, UserPlus, Trash2, AlertTriangle, Loader2, ArrowLeft, RefreshCw, Edit2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function JuradosPage() {
  const router = useRouter();
  const { data, mutate, error: swrError } = useSWR("/api/state", fetcher, { refreshInterval: 2000 });
  const [checkingAuth, setCheckingAuth] = useState(true);

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [editingJurado, setEditingJurado] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");

  useEffect(() => {
    if (!data && !swrError) {
      const t = setTimeout(() => setLoadingTimeout(true), 8000);
      return () => clearTimeout(t);
    }
    setLoadingTimeout(false);
  }, [data, swrError]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isVerified = getCookie("admin_verified") === "true";
      if (!isVerified) {
        window.location.href = "/login";
      } else {
        setCheckingAuth(false);
      }
    }
  }, []);

  if (checkingAuth) return null;

  const addJurado = async () => {
    if (!newName) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateState",
          jurados: [...(data?.jurados || []), { id: `j${Date.now()}`, name: newName, pin: newPin || "" }]
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao adicionar jurado");
      }
      setNewName("");
      setNewPin("");
      mutate();
    } catch (e: any) {
      setError(e.message || "Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const removeJurado = async (id: string) => {
    if (!data?.jurados) return;
    setLoading(true);
    setError("");
    try {
      const remaining = data.jurados.filter((j: any) => j.id !== id);
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateState", jurados: remaining })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao remover jurado");
      }
      mutate();
    } catch (e: any) {
      setError(e.message || "Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const startEditJurado = (j: any) => {
    setEditingJurado(j.id);
    setEditName(j.name);
    setEditPin(j.pin || "");
  };

  const saveEditJurado = async (juradoId: string) => {
    if (!editName || !data?.jurados) return;
    setLoading(true);
    setError("");
    try {
      const updated = data.jurados.map((j: any) =>
        j.id === juradoId ? { ...j, name: editName, pin: editPin } : j
      );
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateState", jurados: updated })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao editar jurado");
      }
      setEditingJurado(null);
      mutate();
    } catch (e: any) {
      setError(e.message || "Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const cancelEditJurado = () => {
    setEditingJurado(null);
  };

  if (!data) {
    const stalled = swrError || loadingTimeout;
    return (
      <div className="container" style={{ textAlign: "center", padding: "6rem" }}>
        {stalled ? (
          <div>
            <AlertTriangle size={48} style={{ color: "#ef4444", margin: "0 auto 1rem" }} />
            <h2 style={{ color: "#ef4444", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
              {swrError ? "Erro de conexão" : "Servidor lento"}
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {swrError ? "Não foi possível conectar ao servidor." : "O servidor está demorando para responder."}
            </p>
            <button onClick={() => { setLoadingTimeout(false); mutate(); }} className="btn" style={{ background: "var(--yellow-brazil)", color: "var(--text-primary)", fontSize: "1rem", padding: "0.8rem 2rem", width: "auto" }}>
              <RefreshCw size={18} style={{ marginRight: "0.4rem" }} /> Tentar novamente
            </button>
          </div>
        ) : (
          <div>
            <Loader2 className="animate-spin" size={32} color="var(--yellow-brazil)" />
            <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>Carregando...</p>
          </div>
        )}
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "5rem" }}>
        <h2 style={{ color: "#ef4444" }}>Erro no servidor: {data.error}</h2>
      </div>
    );
  }

  const jurados = data.jurados || [];

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={() => router.push("/admin")}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-light)",
            borderRadius: "12px",
            padding: "0.6rem",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex"
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: "2.2rem", color: "var(--blue-brazil)" }}>
          <ShieldAlert size={28} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
          Jurados
        </h1>
      </div>

      {error && (
        <div
          style={{
            padding: "0.8rem 1.2rem",
            marginBottom: "1.5rem",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.95rem"
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Add form */}
      <div className="glass" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1.2rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <UserPlus size={18} /> Adicionar jurado
        </h2>
        <div style={{ display: "flex", gap: "0.8rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
          <input
            placeholder="Nome do jurado"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "0.8rem 1rem",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.5)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-light)",
              fontFamily: "inherit",
              fontSize: "1rem",
              outline: "none"
            }}
            onKeyDown={(e) => e.key === "Enter" && addJurado()}
          />
          <input
            placeholder="PIN"
            value={newPin}
            maxLength={4}
            onChange={(e) => setNewPin(e.target.value)}
            style={{
              width: "90px",
              padding: "0.8rem",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.5)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-light)",
              fontFamily: "inherit",
              fontSize: "1rem",
              textAlign: "center",
              outline: "none"
            }}
            onKeyDown={(e) => e.key === "Enter" && addJurado()}
          />
        </div>
        <button
          disabled={loading || !newName}
          onClick={addJurado}
          className="btn"
          style={{
            background: loading ? "var(--text-secondary)" : "var(--yellow-brazil)",
            color: loading ? "white" : "var(--text-primary)",
            fontSize: "1rem",
            padding: "0.8rem",
            opacity: loading || !newName ? 0.5 : 1
          }}
        >
          {loading ? "Salvando..." : "Adicionar"}
        </button>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {jurados.map((j: any) => (
          <div
            key={j.id}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.2rem"
            }}
          >
            {editingJurado === j.id ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1 }}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditJurado(j.id)}
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.5)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-light)",
                    fontFamily: "inherit",
                    fontSize: "0.95rem",
                    outline: "none"
                  }}
                  autoFocus
                />
                <input
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditJurado(j.id)}
                  maxLength={4}
                  placeholder="PIN"
                  style={{
                    width: "70px",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.5)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-light)",
                    fontFamily: "inherit",
                    fontSize: "0.95rem",
                    textAlign: "center",
                    outline: "none"
                  }}
                />
                <button onClick={() => saveEditJurado(j.id)} disabled={loading} style={{ background: "transparent", color: "#10b981", border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
                  <Save size={18} />
                </button>
                <button onClick={cancelEditJurado} disabled={loading} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{j.name}</div>
                  {j.pin && (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      PIN: {j.pin}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => startEditJurado(j)}
                    disabled={loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#f59e0b",
                      cursor: loading ? "not-allowed" : "pointer",
                      padding: "0.4rem",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      opacity: loading ? 0.4 : 1
                    }}
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button
                    onClick={() => removeJurado(j.id)}
                    disabled={loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: loading ? "not-allowed" : "pointer",
                      padding: "0.4rem",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      opacity: loading ? 0.4 : 1
                    }}
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {jurados.length === 0 && (
          <div
            className="glass"
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-secondary)",
              fontSize: "0.95rem"
            }}
          >
            Nenhum jurado cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
