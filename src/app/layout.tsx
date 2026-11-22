import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SWAPA — Swap what you have. Find what you love.",
    template: "%s · SWAPA",
  },
  description:
    "SWAPA is a free peer-to-peer item exchange platform. Give your things a new home and discover something new.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
