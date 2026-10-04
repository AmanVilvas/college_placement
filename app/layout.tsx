import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

const geist = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MMDU Placement Cell | MM(DU) Mullana",
  description: "Placement drives, student applications, and recruitment updates from the MMDU Placement Cell at MM(DU) Mullana.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
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
