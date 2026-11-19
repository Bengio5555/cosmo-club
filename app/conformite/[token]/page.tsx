import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { UploadForm } from "./UploadForm";

export const metadata: Metadata = {
  title: "Vos documents",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConformitePublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const db = createAdminClient();
  const { data: staff } = await db
    .from("staff")
    .select("id,full_name,siret,legal_status,archived")
    .eq("compliance_token", token)
    .maybeSingle();
  if (!staff || staff.archived) notFound();

  const { data: docs } = await db
    .from("staff_documents")
    .select("kind,issued_at,valid_until,created_at")
    .eq("staff_id", staff.id)
    .order("created_at", { ascending: false });
  const lastAtt = docs?.find((d) => d.kind === "attestation_vigilance") ?? null;
  const lastRc = docs?.find((d) => d.kind === "rc_pro") ?? null;
  const firstName = staff.full_name.trim().split(/\s+/)[0] || "";

  return (
    <main className="min-h-screen bg-[#f4ecd6] px-4 py-10 text-[#2a1f14]">
      <div className="mx-auto max-w-xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#8b1a1a]">Cosmo Club · Documents</p>
        <div className="mt-6 rounded-2xl bg-[#fffaf0] p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour {firstName},</h1>
          <p className="mt-3 text-[15px] leading-relaxed">
            Comme vous travaillez régulièrement avec Cosmo Club, la loi nous demande de conserver votre{" "}
            <strong>attestation de vigilance URSSAF</strong>, qui confirme que vous êtes à jour de vos déclarations. Nous la renouvelons tous
            les 3 mois. Vos documents restent confidentiels.
          </p>
          <div className="mt-4 rounded-xl bg-[#f4ecd6] p-4 text-sm leading-relaxed">
            <strong>Où la trouver :</strong> sur votre espace URSSAF (autoentrepreneur.urssaf.fr ou urssaf.fr), rubrique « Mes documents »
            puis « Attestation de vigilance ». Elle se télécharge en PDF en une minute.
          </div>
          {lastAtt && (
            <p className="mt-4 text-sm text-[#6b5a48]">
              Dernière attestation reçue : délivrée le {fr(lastAtt.issued_at ?? lastAtt.created_at)}
              {lastAtt.valid_until ? `, valable jusqu'au ${fr(lastAtt.valid_until)}` : ""}.
            </p>
          )}
          <UploadForm
            token={token}
            siret={staff.siret}
            legalStatus={staff.legal_status === "micro" || staff.legal_status === "societe" ? staff.legal_status : null}
            hasRc={!!lastRc}
          />
        </div>
        <p className="mt-6 text-center text-xs text-[#6b5a48]">Une question ? Répondez simplement à l&apos;email que vous avez reçu.</p>
      </div>
    </main>
  );
}

function fr(iso: string) {
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
