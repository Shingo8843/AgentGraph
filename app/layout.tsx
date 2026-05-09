import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentGraph",
  description: "Load and connect OpenClaw context"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
