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
import Script from "next/script";
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
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  applicationName: "R & A Wedding",
  appleWebApp: {
    capable: true,
    title: "R & A Wedding",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1310",
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover lets us read env(safe-area-inset-*) so the
  // bottom player + collapsed pill stay clear of the iOS home
  // indicator and the Android/Brave browser bottom toolbar.
  viewportFit: "cover",
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
      <head>
        {/* Preconnect to YouTube thumbnail CDN — saves DNS+TLS on the
            first track-row thumbnail. crossOrigin is needed because the
            thumb requests are anonymous (no credentials). */}
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
      </head>
      <body>
        <div className="app-bg" aria-hidden />
        <div className="app-ambient" aria-hidden />
        {children}
        {/* Service-worker registration. Inlined (not a component) so the
            PWA shell can be cached without touching any component file.
            Runs after hydration; silently no-ops on unsupported browsers. */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker
                  .register('/sw.js', { scope: '/' })
                  .catch(function () { /* offline support is best-effort */ });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
