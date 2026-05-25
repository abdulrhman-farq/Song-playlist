import type { Metadata, Viewport } from "next";
import {
  Amiri,
  Cinzel,
  Cormorant_Garamond,
  Inter,
  Italiana,
  Markazi_Text,
  Tajawal,
} from "next/font/google";
import "./globals.css";

/* All seven faces self-hosted at build time via next/font.
   `display: "swap"` avoids invisible-text on first paint.
   Each binds to a CSS variable consumed in globals.css. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});
const italiana = Italiana({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-italiana",
  display: "swap",
});
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});
const markazi = Markazi_Text({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-markazi",
  display: "swap",
});
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ruwaida's Wedding · رويـدا و عبدالرحمن",
  description:
    "A real-time wedding playlist + editable timeline for Ruwaida & Abdulrahman — Friday 29 May 2026.",
  metadataBase: new URL("https://song-playlist-three.vercel.app"),
  openGraph: {
    title: "Ruwaida's Wedding · رويـدا و عبدالرحمن",
    description: "Friday · 29 May 2026 · A wedding playlist & timeline.",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1104,
        height: 2400,
        alt: "Ruwaida's Wedding monogram",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruwaida's Wedding · رويـدا و عبدالرحمن",
    description: "Friday · 29 May 2026",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVariables = [
    inter.variable,
    cormorant.variable,
    cinzel.variable,
    italiana.variable,
    tajawal.variable,
    markazi.variable,
    amiri.variable,
  ].join(" ");

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={fontVariables}>
      <body>
        <div className="app-bg" aria-hidden />
        <div className="app-ambient" aria-hidden />
        {children}
      </body>
    </html>
  );
}
