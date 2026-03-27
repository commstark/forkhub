import type { Metadata } from "next";
import localFont from "next/font/local";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/NavBar";
import CommandPalette from "@/components/CommandPalette";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "The Fork Hub — The Control Plane for Employee-Built AI Tools",
    template: "%s — The Fork Hub",
  },
  description: "Your team is building tools with AI. The Fork Hub is where those tools get stored, reviewed, shared, and forked — with security reviews built in.",
  keywords: ["internal tool marketplace", "shadow AI governance", "AI tool management", "vibe coding", "security review", "employee tools", "corporate tool store", "fork tools"],
  authors: [{ name: "The Fork Hub" }],
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://www.theforkhub.net"),
  robots: "index, follow",
  themeColor: "#c2724f",
  openGraph: {
    title: "The Fork Hub",
    description: "The corporate marketplace for AI-generated internal tools. Upload, review, share, and fork — with built-in security.",
    type: "website",
    url: "https://www.theforkhub.net",
    siteName: "The Fork Hub",
    images: [{ url: "https://www.theforkhub.net/api/og", width: 1200, height: 630, alt: "The Fork Hub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Fork Hub",
    description: "The corporate marketplace for AI-generated internal tools.",
    images: ["https://www.theforkhub.net/api/og"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "production" && (
          <script dangerouslySetInnerHTML={{__html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"69bb4b2e2c94d100151a66eb"})},document.head.appendChild(o)}initApollo();`}} />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
        <Providers>
          <NavBar />
          <CommandPalette />
          {children}
        </Providers>
      </body>
    </html>
  );
}
