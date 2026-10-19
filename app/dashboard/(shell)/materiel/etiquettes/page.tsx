import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { qrSvgForToken } from "@/lib/equipment/qr";
import { EQUIPMENT_CATEGORY_LABEL } from "@/lib/equipment/shared";
import { PrintLabelsButton } from "./PrintLabelsButton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Planche d'étiquettes à imprimer (A4, 8 par page) : QR + code + nom.
 * `?ids=a,b,c` limite la planche à certains éléments ; sans paramètre,
 * tous les éléments actifs.
 */
export default async function EtiquettesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const idsParam = typeof sp.ids === "string" ? sp.ids : "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  const supabase = await createClient();
  let query = supabase
    .from("equipment")
    .select("id,code,name,category,qr_token")
    .order("category")
    .order("code");
  query = ids.length ? query.in("id", ids) : query.eq("archived", false);
  const { data: items } = await query;

  const labels = await Promise.all(
    (items ?? []).map(async (it) => ({ ...it, svg: await qrSvgForToken(it.qr_token) })),
  );

  return (
    <div className="labels-page px-6 py-6 md:px-10 md:py-8">
      <style>{`
        .labels-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 900px) { .labels-grid { grid-template-columns: repeat(4, 1fr); } }
        .label { break-inside: avoid; page-break-inside: avoid; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 12px; text-align: center; background: #fff; color: #1a1614; }
        .label svg { width: 100%; height: auto; display: block; }
        .label-code { margin-top: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.04em; }
        .label-name { margin-top: 2px; font-size: 13px; line-height: 1.3; }
        .label-cat { margin-top: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8b1a1a; }
        .label-brand { margin-top: 8px; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #5a5147; }
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: #fff !important; }
          .no-print, nav, aside, header.dashboard-topbar { display: none !important; }
          .labels-page { padding: 0 !important; }
          .labels-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8mm; }
          .label { border-color: #94a3b8; }
        }
      `}</style>

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/materiel"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Matériel
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Étiquettes QR
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {labels.length} étiquette{labels.length > 1 ? "s" : ""}. Imprime sur papier
            autocollant ou plastifie-les : un QR abîmé se rescanne mal.
          </p>
        </div>
        <PrintLabelsButton />
      </div>

      {labels.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun élément à imprimer.</p>
      ) : (
        <div className="labels-grid">
          {labels.map((l) => (
            <div key={l.id} className="label">
              <div dangerouslySetInnerHTML={{ __html: l.svg }} />
              <p className="label-code">{l.code}</p>
              <p className="label-name">{l.name}</p>
              <p className="label-cat">{EQUIPMENT_CATEGORY_LABEL[l.category]}</p>
              <p className="label-brand">Cosmo Club Paris</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
