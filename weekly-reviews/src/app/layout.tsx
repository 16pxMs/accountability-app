import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import Navbar from "@/components/Navbar"; // Import Navbar
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Weekly Reviews | 2026",
  description: "Track consistency and outcomes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable}`}>
        <Navbar />
        {/* Spacer for Fixed Navbar */}
        <div style={{ height: '80px' }}></div>
        {children}
      </body>
    </html>
  );
}
