
import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TJ.RENDERAI — AI Architectural Render Studio",
  description:
    "Create and transform architectural renders with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7139680741654550"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>

      <body className="min-h-full flex flex-col">
        {children}

        {/* Adsterra Script 1 */}
        <Script
          data-cfasync="false"
          src="https://ahuramazda.org/1/ff23b41f337df2a10501dbf25ffadf29"
          strategy="afterInteractive"
        />

        {/* Adsterra Script 2 */}
        <Script
          data-cfasync="false"
          src="https://brijmohan.org/14/8ecf27b782526f4feb753ce5e70a9661"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
