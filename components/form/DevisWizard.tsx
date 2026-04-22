"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { devisSchema, stepFields, type DevisInput, eventTypes, offers } from "@/lib/content/devis";
import { FieldShell, Input, OptionCard, Textarea } from "./fields";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

const TOTAL_STEPS = 4;

export function DevisWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const form = useForm<DevisInput>({
    resolver: zodResolver(devisSchema) as any,
    mode: "onTouched",
    defaultValues: {
      eventType: undefined as unknown as DevisInput["eventType"],
      offer: undefined as unknown as DevisInput["offer"],
      date: "",
      location: "",
      guests: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      message: "",
      website: "",
    },
  });

  const goNext = async () => {
    const fields = stepFields[step];
    const valid = await form.trigger([...fields] as (keyof DevisInput)[], { shouldFocus: true });
    if (!valid) return;
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => (s + 1) as typeof step);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => (s - 1) as typeof step);
    }
  };

  const handleSelectEventType = useCallback((eventTypeId: string) => {
    form.setValue("eventType", eventTypeId as DevisInput["eventType"], { shouldValidate: true });
    setDirection(1);
    setStep(2);
  }, [form]);

  const handleSelectOffer = useCallback((offerId: string) => {
    form.setValue("offer", offerId as DevisInput["offer"], { shouldValidate: true });
    setDirection(1);
    setStep(3);
  }, [form]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      setStatus("submitting");
      setServerError(null);
      try {
        const res = await fetch("/api/devis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          setStatus("error");
          setServerError(typeof body?.error === "string" ? body.error : "send_failed");
          return;
        }
        setStatus("success");
      } catch {
        setStatus("error");
        setServerError("network");
      }
    },
    // Invalid-submit handler: find the first step that still has errors and
    // bring the user back to it so they can fix. Without this, validation
    // errors on hidden earlier steps fail silently and the submit button
    // appears dead.
    (errors) => {
      const order: (keyof DevisInput)[][] = [
        [...stepFields[1]] as (keyof DevisInput)[],
        [...stepFields[2]] as (keyof DevisInput)[],
        [...stepFields[3]] as (keyof DevisInput)[],
        [...stepFields[4]] as (keyof DevisInput)[],
      ];
      for (let i = 0; i < order.length; i++) {
        const hasError = order[i].some((f) => errors[f]);
        if (hasError) {
          setDirection(-1);
          setStep((i + 1) as typeof step);
          setStatus("error");
          const firstField = order[i].find((f) => errors[f]);
          const msg = firstField
            ? errors[firstField]?.message || "Champ invalide"
            : "Formulaire invalide";
          setServerError(`validation:${firstField ?? ""}:${msg}`);
          return;
        }
      }
    },
  );

  if (status === "success") {
    return <SuccessScreen firstName={form.getValues("firstName")} />;
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative flex min-h-[620px] flex-col rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream-paper)] p-6 md:p-10"
    >
      {/* honeypot */}
      <input
        type="text"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
        {...form.register("website")}
      />

      <Progress step={step} />

      <div className="relative mt-10 flex-1">
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
          className="flex flex-col"
        >
          {step === 1 && <StepEventType form={form} onSelect={handleSelectEventType} />}
          {step === 2 && <StepOffer form={form} onSelect={handleSelectOffer} />}
          {step === 3 && <StepLogistics form={form} />}
          {step === 4 && <StepContact form={form} />}
        </motion.div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-[color:var(--color-ash)]/60 pt-6">
        <button
          type="button"
          onClick={goBack}
          className={cn(
            "inline-flex items-center gap-2 px-2 py-2 text-[11px] uppercase tracking-[0.28em] transition-colors",
            step === 1
              ? "cursor-not-allowed text-[color:var(--color-espresso)]/25"
              : "text-[color:var(--color-espresso)]/70 hover:text-[color:var(--color-grenat)]",
          )}
        >
          <ArrowLeft className="h-3 w-3" /> Retour
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-6 py-3 text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
            <span className="relative">Suivant</span>
            <ArrowRight className="relative h-3 w-3" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={status === "submitting"}
            className={cn(
              "group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-ink-text)] transition-colors duration-500",
              status === "submitting"
                ? "cursor-wait bg-[color:var(--color-ash)]"
                : "bg-[color:var(--color-grenat)] hover:bg-[color:var(--color-grenat-glow)]",
            )}
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
            <span className="relative">
              {status === "submitting" ? "Envoi…" : "Envoyer la demande"}
            </span>
            {status === "submitting" ? null : <Check className="relative h-3 w-3" />}
          </button>
        )}
      </div>

      {status === "error" && (
        <div className="mt-4 rounded-md border border-[color:var(--color-grenat)]/30 bg-[color:var(--color-grenat)]/5 p-3 text-sm text-[color:var(--color-grenat)]">
          {serverError && serverError.startsWith("validation:") ? (
            <p>
              Un champ est invalide : <strong>{serverError.split(":")[2] || "vérifie le formulaire"}</strong>. On t&apos;a ramené à l&apos;étape concernée — corrige puis renvoie.
            </p>
          ) : (
            <p>
              Impossible d&apos;envoyer — réessayez dans un instant ou écrivez-nous directement à
              {" "}
              <a href="mailto:contact@cosmoclub.fr" className="underline">
                contact@cosmoclub.fr
              </a>
              .
              {serverError ? ` (code: ${serverError})` : ""}
            </p>
          )}
        </div>
      )}
    </form>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
};

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="eyebrow">
        Étape {String(step).padStart(2, "0")} / 04
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-[2px] w-10 rounded-full transition-colors duration-500",
              i <= step ? "bg-[color:var(--color-or)]" : "bg-[color:var(--color-ash)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Steps ─────────────────────────────────────────── */

type Form = ReturnType<typeof useForm<DevisInput>>;

function StepEventType({ form, onSelect }: { form: Form; onSelect: (id: string) => void }) {
  const selected = form.watch("eventType");
  const err = form.formState.errors.eventType?.message;
  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <p className="eyebrow mb-4"><span className="rule" />Étape 01</p>
        <h3 className="font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
          Quel genre d'événement ?
        </h3>
        <p className="mt-3 text-sm text-[color:var(--color-espresso)]/70">
          Choisissez celui qui s'en approche le plus — vous préciserez ensuite.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {eventTypes.map((t, i) => (
          <OptionCard
            key={t.id}
            index={`0${i + 1}`}
            selected={selected === t.id}
            onClick={() => onSelect(t.id)}
            title={t.label}
            description={t.desc}
          />
        ))}
      </div>
      {err && <p className="mt-4 text-sm text-[color:var(--color-grenat-glow)]">{err}</p>}
    </div>
  );
}

function StepOffer({ form, onSelect }: { form: Form; onSelect: (id: string) => void }) {
  const selected = form.watch("offer");
  const err = form.formState.errors.offer?.message;
  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <p className="eyebrow mb-4"><span className="rule" />Étape 02</p>
        <h3 className="font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
          Cocktails, barista, ou les deux ?
        </h3>
        <p className="mt-3 text-sm text-[color:var(--color-espresso)]/70">
          On ajustera les détails ensemble. Aucun choix n'est définitif.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((o, i) => (
          <OptionCard
            key={o.id}
            index={`0${i + 1}`}
            selected={selected === o.id}
            onClick={() => onSelect(o.id)}
            title={o.label}
            description={o.desc}
          />
        ))}
      </div>
      {err && <p className="mt-4 text-sm text-[color:var(--color-grenat-glow)]">{err}</p>}
    </div>
  );
}

function StepLogistics({ form }: { form: Form }) {
  const errors = form.formState.errors;
  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <p className="eyebrow mb-4"><span className="rule" />Étape 03</p>
        <h3 className="font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
          Quand, où, combien ?
        </h3>
        <p className="mt-3 text-sm text-[color:var(--color-espresso)]/70">
          Approximatif suffit — on affine après.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <FieldShell
          label="Date de l'événement"
          error={errors.date?.message}
          hint="ex. 14 juin 2026, fin septembre, printemps 2026"
          htmlFor="date"
        >
          <Controller
            name="date"
            control={form.control}
            render={({ field }) => (
              <Input
                id="date"
                placeholder="14 juin 2026"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>

        <FieldShell
          label="Lieu"
          error={errors.location?.message}
          hint="Ville, quartier ou adresse exacte"
          htmlFor="location"
        >
          <Controller
            name="location"
            control={form.control}
            render={({ field }) => (
              <Input
                id="location"
                placeholder="Paris 8 — Hôtel de Crillon"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>

        <FieldShell
          label="Nombre d'invités"
          error={errors.guests?.message}
          hint="Approximatif — 80, 150, 400…"
          htmlFor="guests"
        >
          <Controller
            name="guests"
            control={form.control}
            render={({ field }) => (
              <Input
                id="guests"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="120"
                value={field.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? undefined : Number(v));
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>
      </div>
    </div>
  );
}

function StepContact({ form }: { form: Form }) {
  const errors = form.formState.errors;
  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <p className="eyebrow mb-4"><span className="rule" />Étape 04</p>
        <h3 className="font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
          On vous rappelle où ?
        </h3>
        <p className="mt-3 text-sm text-[color:var(--color-espresso)]/70">
          Réponse sous 48h. Promis.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <FieldShell label="Prénom" error={errors.firstName?.message} htmlFor="firstName">
          <Controller
            name="firstName"
            control={form.control}
            render={({ field }) => (
              <Input
                id="firstName"
                autoComplete="given-name"
                placeholder="Camille"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>
        <FieldShell label="Nom" error={errors.lastName?.message} htmlFor="lastName">
          <Controller
            name="lastName"
            control={form.control}
            render={({ field }) => (
              <Input
                id="lastName"
                autoComplete="family-name"
                placeholder="Martin"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>
        <FieldShell label="Email" error={errors.email?.message} htmlFor="email">
          <Controller
            name="email"
            control={form.control}
            render={({ field }) => (
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="camille@domaine.fr"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>
        <FieldShell label="Téléphone" error={errors.phone?.message} htmlFor="phone">
          <Controller
            name="phone"
            control={form.control}
            render={({ field }) => (
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>
      </div>

      <div className="mt-6">
        <FieldShell
          label="Votre message (optionnel)"
          error={errors.message?.message}
          hint="Ambiance, budget, contraintes, envies particulières…"
          htmlFor="message"
        >
          <Controller
            name="message"
            control={form.control}
            render={({ field }) => (
              <Textarea
                id="message"
                placeholder="Dites-nous tout."
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </FieldShell>
      </div>
    </div>
  );
}

/* ─── Success ───────────────────────────────────────── */

function SuccessScreen({ firstName }: { firstName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
      className="relative flex min-h-[620px] flex-col items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-or)]/40 bg-[color:var(--color-cream-paper)] p-10 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 40%, rgba(201,169,97,0.2), transparent 65%), radial-gradient(ellipse 40% 40% at 50% 80%, rgba(139,26,26,0.22), transparent 60%)",
        }}
      />
      <p className="relative eyebrow mb-6"><span className="rule" />Demande reçue</p>
      <h3 className="relative font-display text-4xl leading-[1.05] text-[color:var(--color-ink-text)] md:text-6xl">
        Merci{firstName ? `, ${firstName}` : ""}.<br />
        <span className="font-accent italic text-[color:var(--color-grenat)]">
          On revient vers vous sous&nbsp;48&nbsp;h.
        </span>
      </h3>
      <p className="relative mt-6 max-w-md text-[color:var(--color-espresso)]/75">
        Pendant ce temps, suivez l'envers du décor sur Instagram — nos derniers cocktails et stands y sont postés chaque semaine.
      </p>
      <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <a
          href="https://www.instagram.com/cosmoclubparis"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-grenat)] px-6 py-3 text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-grenat)] hover:bg-[color:var(--color-grenat)] hover:text-[color:var(--color-bone)] transition-colors"
        >
          @cosmoclubparis <span aria-hidden>↗</span>
        </a>
      </div>
    </motion.div>
  );
}
