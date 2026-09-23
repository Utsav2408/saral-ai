import {
  Libre_Baskerville,
  Source_Sans_3,
} from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const display = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Clarity — Understand your lease",
  description:
    "Upload a residential lease to see parsed clauses and key facts. No accounts required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-ink bg-canvas">
        {children}
      </body>
    </html>
  );
}
