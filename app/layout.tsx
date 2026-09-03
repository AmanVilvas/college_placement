import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlacementOS • College Placement Management Platform",
  description: "A modern, unified campus recruitment operating system for universities, placement cells, and students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#f8fafc] text-[#0f172a]">
        {children}
        <Script
          id="omnidimension-web-widget"
          async
          src="https://omnidim.io/web_widget.js?secret_key=f44a175928beebfc760c74a482c39bf7"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
