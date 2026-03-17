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
  title: "The Fork Hub",
  description: "AI tool library for your organization — share, review, and iterate on internal tools.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://forkhub.app"),
  openGraph: {
    title: "The Fork Hub",
    description: "Share, review, and iterate on internal tools.",
    type: "website",
    siteName: "The Fork Hub",
  },
  twitter: {
    card: "summary",
    title: "The Fork Hub",
    description: "Share, review, and iterate on internal tools.",
  },
  icons: {
    icon: [
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
