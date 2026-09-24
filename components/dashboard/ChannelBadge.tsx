import { channelGroup, channelLabel, type ChannelGroup } from "@/lib/attribution";

const TONE: Record<ChannelGroup, string> = {
  paid: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  organic: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  social: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  referral: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  direct: "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
  offline: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
};

/**
 * Provenance pill for a demande. Colour = channel family so a glance at
 * the list tells paid vs organic vs word-of-mouth apart.
 */
export function ChannelBadge({
  value,
  campaign,
}: {
  value: string | null | undefined;
  campaign?: string | null;
}) {
  if (!value) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  }
  const group = channelGroup(value);
  const tone = group ? TONE[group] : TONE.direct;
  return (
    <span className="inline-flex max-w-full flex-col items-start gap-0.5">
      <span
        className={
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " + tone
        }
      >
        {channelLabel(value)}
      </span>
      {campaign && (
        <span
          className="max-w-[160px] truncate text-[10px] text-slate-500 dark:text-slate-400"
          title={campaign}
        >
          {campaign}
        </span>
      )}
    </span>
  );
}
