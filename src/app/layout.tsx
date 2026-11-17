import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AmbienceToggle } from "@/components/game/ambience-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qamarah, the Lantern Port — AI RPG",
  description:
    "A Voyage-style AI roleplaying world engine: a lawless monsoon coast where the pleasure houses are the real seats of power. Persistent stats, autonomous NPCs, a live bond ledger, and the campaign of the Three Houses.",
  keywords: ["AI RPG", "text adventure", "world engine", "Voyage", "Qamarah"],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Qamarah, the Lantern Port",
    description:
      "A Voyage-style AI roleplaying world engine of dark political fantasy.",
    siteName: "Z.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <AmbienceToggle />
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
