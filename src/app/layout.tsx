import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arrai-el - O Arraiá do Povo de Deus",
  description: "Placar e votação em tempo real",
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

        {children}
      </body>
    </html>
  );
}
