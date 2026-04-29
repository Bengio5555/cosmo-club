import { Fraunces, Inter_Tight, Cormorant_Garamond } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  preload: true,
});

export const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
  weight: ["400", "500", "600"],
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const fontClassName = [
  fraunces.variable,
  interTight.variable,
  cormorant.variable,
].join(" ");
