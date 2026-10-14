import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "1453 Event Roster",
  description: "1453 event participation roster for players, events, and readiness"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06101c"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
