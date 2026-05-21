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

        {/* Logo Marca D'água (Fundo) */}
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: -1, pointerEvents: 'none', opacity: 0.06 }}>
          <img src="/logologos.png" alt="" style={{ width: '70vw', maxWidth: 800, height: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Logo da Escola (Topo) */}
        <div style={{ position: 'fixed', top: '0.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none' }}>
          <img src="/logologos.png" alt="Instituto Educacional Logos" style={{ height: '8vw', maxHeight: 90, objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' }} />
        </div>

        {children}
      </body>
    </html>
  );
}
