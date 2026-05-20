import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arrai-el 2026 - Instituto Educacional Logos",
  description: "Gincana 2026 - Redenção-CE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 40 bandeirinhas garantem que a tela toda seja coberta (resoluções ultra-wide)
  const bandeiras = Array.from({ length: 40 });

  return (
    <html lang="pt-BR">
      <body>
        {/* Bordas Rústicas (Festa Junina) */}
        <div className="plaid-border-left" />
        <div className="plaid-border-right" />
        
        {/* Bandeirinhas Copa do Mundo (Verde, Amarelo, Azul, Branco) */}
        <div className="bandeirinhas-container">
          {bandeiras.map((_, i) => (
            <div key={i} className={`bandeirinha color-${i % 4}`} />
          ))}
        </div>

        {/* 5 Estrelas (Brasil Hexa) flutuando no topo */}
        <div style={{ position: 'fixed', top: '5.5vw', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.8rem', zIndex: 1, opacity: 0.8, pointerEvents: 'none' }}>
          {Array.from({length: 5}).map((_, i) => (
            <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="rgba(255, 234, 0, 0.8)" stroke="none" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 234, 0, 0.6))' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>

        {children}
      </body>
    </html>
  );
}
