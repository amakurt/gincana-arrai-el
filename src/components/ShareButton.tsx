"use client";

import { Share2, Check, Link, X, MessageCircle, Camera } from "lucide-react";
import { useEffect, useState } from "react";

export default function ShareButton({ url, label = "Compartilhar" }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url);

  useEffect(() => {
    setShareUrl(url.startsWith("http") ? url : `${window.location.origin}${url}`);
  }, [url]);

  const handleCopy = () => {
    setCopied(true);
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
  };

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: <MessageCircle size={22} />,
      color: "#25D366",
      href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Instagram",
      icon: <Camera size={22} />,
      color: "#E4405F",
      action: handleCopy,
      label: copied ? "Copiado!" : "Copiar link",
    },
    {
      name: "Facebook",
      icon: <span style={{ fontWeight: 900, fontSize: 18 }}>f</span>,
      color: "#1877F2",
      href: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "X (Twitter)",
      icon: <span style={{ fontWeight: 900, fontSize: 16 }}>𝕏</span>,
      color: "#000",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          padding: "0.5rem 1rem",
          borderRadius: "10px",
          color: "var(--text-secondary)",
          fontWeight: 600,
          fontSize: "0.85rem",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s",
          outline: "none",
        }}
        aria-label={label}
      >
        <Share2 size={16} />
        {label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass"
            style={{
              padding: "2rem",
              width: "90%",
              maxWidth: 380,
              position: "relative",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "none", border: "none",
                color: "var(--text-secondary)", cursor: "pointer",
                padding: 4, display: "flex",
              }}
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              Compartilhar
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {socialLinks.map((item) =>
                item.href ? (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setTimeout(() => setOpen(false), 200)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.85rem 1rem", borderRadius: "12px",
                      background: "var(--bg-card)", border: "1px solid var(--border-light)",
                      color: "var(--text-primary)", fontWeight: 700,
                      textDecoration: "none", transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                  >
                    <span style={{ color: item.color, display: "flex" }}>{item.icon}</span>
                    {item.name}
                  </a>
                ) : (
                  <button
                    key={item.name}
                    onClick={item.action}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.85rem 1rem", borderRadius: "12px",
                      background: "var(--bg-card)", border: "1px solid var(--border-light)",
                      color: "var(--text-primary)", fontWeight: 700,
                      fontFamily: "inherit", fontSize: "1rem",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                  >
                    <span style={{ color: item.color, display: "flex" }}>{item.icon}</span>
                    {item.label || item.name}
                  </button>
                )
              )}
            </div>

            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)" }}>
              <button
                onClick={handleCopy}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  width: "100%", padding: "0.85rem", borderRadius: "12px",
                  background: copied ? "rgba(16,185,129,0.15)" : "var(--bg-card)",
                  border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border-light)"}`,
                  color: copied ? "var(--team-c)" : "var(--text-secondary)",
                  fontWeight: 700, fontFamily: "inherit", fontSize: "1rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {copied ? <Check size={18} /> : <Link size={18} />}
                {copied ? "Link copiado!" : "Copiar link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
