import { Fraunces, Inter_Tight, Cormorant_Garamond } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
  weight: ["300", "400", "500", "600", "700"],
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export const fontClassName = [
  fraunces.variable,
  interTight.variable,
  cormorant.variable,
].join(" ");
