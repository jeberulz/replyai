import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ReplyPilot AI",
  description:
    "Find the conversations worth joining on X, and reply in your own voice before the window closes.",
  applicationName: "ReplyPilot AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ReplyPilot",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${geistMono.variable} ${instrumentSerif.variable} dark h-full antialiased`}
      // Extensions (Grammarly, scribe, etc.) mutate <html>/<body> before hydrate.
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        {children}
        <Toaster position="bottom-right" richColors theme="dark" />
      </body>
    </html>
  );
}
