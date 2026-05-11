import { Fraunces, Inter_Tight, Cormorant_Garamond } from "next/font/google";

// Trimmed font set — only weights actually used in the codebase (grep
// of `font-*` utility classes). Cuts ~3 woff2 files off the critical
// path: 300 had a single occurrence on Fraunces, 300/700 on Inter Tight
// were unused, and Cormorant is only used as an italic accent.
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
  weight: ["400"],
  style: ["italic"],
});

export const fontClassName = [
  fraunces.variable,
  interTight.variable,
  cormorant.variable,
].join(" ");
