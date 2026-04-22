import { Download } from "lucide-react";

/**
 * PDF download — hits the server API route that renders the shopping
 * list with @react-pdf/renderer and streams it as an attachment. Plain
 * `<a download>` rather than window.print() so the user gets a real
 * file without going through the print dialog.
 */
export function PrintButton({
  eventId,
  mode,
}: {
  eventId: string;
  mode: "shortage" | "full";
}) {
  const qs = mode === "full" ? "?mode=full" : "";
  return (
    <a
      className="primary"
      href={`/api/dashboard/events/${eventId}/courses-pdf${qs}`}
    >
      <Download className="h-3 w-3" />
      Télécharger PDF
    </a>
  );
}
