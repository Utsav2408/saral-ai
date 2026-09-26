import {
  Libre_Baskerville,
  Noto_Sans_Devanagari,
  Noto_Serif_Devanagari,
  Source_Sans_3,
} from "next/font/google";
import type { Metadata } from "next";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SkipLink } from "@/components/SkipLink";
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

/** Devanagari body — loaded always so Hindi UI / GenAI output renders correctly. */
const sansDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-deva",
});

const displayDeva = Noto_Serif_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "700"],
  variable: "--font-display-deva",
});

export const metadata: Metadata = {
  title: "Saral AI — Understand your lease",
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
      className={`${display.variable} ${sans.variable} ${sansDeva.variable} ${displayDeva.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-ink bg-canvas">
        <LocaleProvider>
          <SkipLink />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
