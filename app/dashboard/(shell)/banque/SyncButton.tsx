"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncBankNow } from "./actions";

export function SyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await syncBankNow();
            setMsg(res.ok ? { kind: "ok", text: res.message } : { kind: "err", text: res.error });
            setTimeout(() => setMsg(null), 4000);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Synchroniser
      </button>
      {msg && (
        <p className={`text-xs ${msg.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
