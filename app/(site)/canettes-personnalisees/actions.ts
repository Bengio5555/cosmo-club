"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Enregistre un essai de personnalisation (marque posée sur la canette).
 * Données anonymes : texte saisi, recette, encre, identifiant de session
 * tiré au hasard côté navigateur. Ni IP, ni contact. Une ligne par
 * marque et par session (index unique), les répétitions sont ignorées.
 *
 * Jamais bloquant pour le visiteur : toute erreur (table absente, clé
 * manquante) est avalée après un log serveur.
 */
export async function recordCanTry(input: {
  brand: string;
  subtitle?: string;
  recipe: string;
  ink: "blanc" | "noir";
  sessionId: string;
}): Promise<void> {
  const brand = (input.brand ?? "").trim().slice(0, 24);
  const subtitle = (input.subtitle ?? "").trim().slice(0, 24);
  const sessionId = (input.sessionId ?? "").trim().slice(0, 64);
  if (brand.length < 2 || !sessionId) return;
  if (!["litchi-rose", "framboise-hibiscus", "coco-peche-aloe"].includes(input.recipe)) return;
  if (input.ink !== "blanc" && input.ink !== "noir") return;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("can_sticker_tries")
      .upsert(
        { brand, subtitle: subtitle || null, recipe: input.recipe, ink: input.ink, session_id: sessionId, page: "/canettes-personnalisees" },
        { onConflict: "session_id,lower(brand)", ignoreDuplicates: true },
      );
    if (error) console.error("[recordCanTry]", error.message);
  } catch (e) {
    console.error("[recordCanTry]", e instanceof Error ? e.message : e);
  }
}
