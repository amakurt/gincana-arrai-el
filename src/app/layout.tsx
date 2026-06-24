import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Arrai-el 2026 - Instituto Educacional Logos",
  description: "Gincana 2026 - Redenção-CE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bandeiras = Array.from({ length: 40 });

  const logos = Array.from({ length: 30 });
  const screenW = 1920;
  const screenH = 1080;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <div className="plaid-border-left" />
        <div className="plaid-border-right" />

        <div className="bandeirinhas-container">
          {bandeiras.map((_, i) => (
            <div key={i} className={`bandeirinha color-${i % 4}`} />
          ))}
        </div>

        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 0, pointerEvents: 'none', overflow: 'hidden', opacity: 0.08,
          }}
        >
          {logos.map((_, i) => {
            const x = ((i * 137 + i * i * 11) % 85) / 100 * screenW;
            const y = ((i * 97 + i * i * 7) % 85) / 100 * screenH;
            return (
              <img
                key={i}
                src="/logologos.png"
                alt=""
                className="logo-watermark"
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: 100 + ((i * 31) % 40),
                  height: 'auto',
                  objectFit: 'contain',
                  animationDelay: `${(i * 0.6) % 4}s`,
                }}
              />
            );
          })}
        </div>

        {children}

        <ThemeToggle />
      </body>
    </html>
  );
}
