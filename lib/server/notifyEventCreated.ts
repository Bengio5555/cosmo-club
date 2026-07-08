import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR } from "@/lib/format";

export type EventForNotif = {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  guests_count: number | null;
};

/**
 * Email the Équipe (staff-role accounts) when an event is created.
 * Best-effort and non-blocking: any failure is logged and swallowed so
 * it never breaks event creation. Uses the admin client to read staff
 * emails (RLS restricts profiles reads to self/owner-admin, and a
 * manager creating an event couldn't otherwise see them). Recipients go
 * in BCC so addresses aren't exposed to each other.
 */
export async function notifyTeamEventCreated(ev: EventForNotif): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // email disabled in this environment

    const admin = createAdminClient();
    const { data: staff } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "staff");
    const recipients = Array.from(
      new Set(
        (staff ?? [])
          .map((s) => (s.email ?? "").trim().toLowerCase())
          .filter((e) => e.includes("@")),
      ),
    );
    if (recipients.length === 0) return;

    const fromEmail = process.env.RESEND_FROM_EMAIL || "devis@cosmoclub.fr";
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
    const link = `${origin}/dashboard/events/${ev.id}`;

    const dateStr =
      ev.end_date && ev.end_date > ev.date
        ? `${formatDateFR(ev.date)} → ${formatDateFR(ev.end_date)}`
        : formatDateFR(ev.date);
    const timeStr = [ev.start_time, ev.end_time].filter(Boolean).join(" – ");
    const rows: Array<[string, string | null]> = [
      ["Date", dateStr],
      ["Horaires", timeStr || null],
      ["Lieu", ev.location],
      ["Invités", ev.guests_count != null ? String(ev.guests_count) : null],
    ];
    const detailHtml = rows
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;">${k}</td><td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(String(v))}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;">
        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b1a1a;font-weight:700;margin:0 0 4px;">Cosmo Club Paris</p>
        <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">Nouvel événement</h1>
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">Un nouvel événement vient d'être ajouté au planning&nbsp;:</p>
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
          <p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 10px;">${escapeHtml(ev.title)}</p>
          <table style="border-collapse:collapse;">${detailHtml}</table>
        </div>
        <p style="margin:20px 0 0;">
          <a href="${link}" style="display:inline-block;background:#8b1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">Voir l'événement</a>
        </p>
        <p style="font-size:11px;color:#9ca3af;margin:24px 0 0;">Notification automatique — équipe Cosmo Club.</p>
      </div>`;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: `Cosmo Club Paris <${fromEmail}>`,
      to: [fromEmail], // placeholder recipient; real ones go in BCC
      bcc: recipients,
      subject: `Nouvel événement — ${ev.title}`,
      html,
    });
  } catch (err) {
    console.error("[notifyTeamEventCreated] failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
