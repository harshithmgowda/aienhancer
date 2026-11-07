import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PIXELFORGE AI — Professional Local AI Video Enhancement",
  description: "Transform ordinary footage into extraordinary clarity using local GPU-accelerated neural networks (Real-ESRGAN & RIFE).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
