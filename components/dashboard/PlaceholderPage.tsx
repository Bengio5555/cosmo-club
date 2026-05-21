import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
  nextSprint,
}: {
  title: string;
  description: string;
  nextSprint: string;
}) {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </header>

      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center">
        <Construction className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-4 text-sm font-medium text-slate-300">
          Module en cours de construction
        </p>
        <p className="mt-1 text-xs text-slate-500">{nextSprint}</p>
      </div>
    </div>
  );
}
