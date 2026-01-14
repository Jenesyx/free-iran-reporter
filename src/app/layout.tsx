import type { Metadata } from "next";
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
  title: "Iran Freedom Reporter - Document Propaganda Accounts",
  description: "A transparency tool to document and identify Instagram accounts spreading propaganda or supporting violence during internet shutdowns in Iran.",
  keywords: ["Iran", "Instagram", "propaganda", "transparency", "accountability"],
  icons: {
    icon: "/flag.svg",
  },
  openGraph: {
    title: "Iran Freedom Reporter",
    description: "Document Instagram accounts spreading propaganda during Iran internet shutdowns.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
