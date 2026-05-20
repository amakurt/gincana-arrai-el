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
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
