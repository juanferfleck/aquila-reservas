import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clase de Prueba Gratuita · Aquila Evolución",
  description:
    "Reservá tu clase de prueba gratuita de calistenia en Aquila Evolución. Cupos limitados.",
  openGraph: {
    title: "Clase de Prueba Gratuita · Aquila Evolución",
    description: "Reservá tu clase de prueba gratuita de calistenia. Cupos limitados.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#d4941e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
