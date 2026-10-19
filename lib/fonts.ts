import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";

/**
 * Typographie du site.
 *  - Bricolage Grotesque : titres et accents (grotesque à caractère, dans
 *    l'esprit du logo). Plus aucun mot en italique : l'accent se fait par
 *    la couleur sur le même caractère.
 *  - Inter Tight : texte courant, interface, dashboard.
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
});

export const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
  weight: ["400", "500", "600"],
});

export const fontClassName = [bricolage.variable, interTight.variable].join(" ");
