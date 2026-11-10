import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { PwaRuntime } from "@/components/Pwa";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Greenhouse",
  description: "Habits that grow like plants. Tell it what you did; it tends the rest.",
  manifest: "/greenhouse/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/greenhouse/icon.svg", type: "image/svg+xml" },
      { url: "/greenhouse/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/greenhouse/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "Greenhouse", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#23382F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        <AppProvider>
          <PwaRuntime />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
