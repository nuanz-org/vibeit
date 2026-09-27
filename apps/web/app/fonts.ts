import { Geist, Geist_Mono } from "next/font/google";

// Same faces as the landing (aiditr-landing/app/fonts.ts).
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
