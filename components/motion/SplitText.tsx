"use client";

import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  by?: "word" | "char";
  delay?: number;
  stagger?: number;
  duration?: number;
};

export function SplitText({
  text,
  className,
  as = "span",
  by = "word",
  delay = 0,
  stagger = 0.06,
  duration = 0.9,
}: Props) {
  const parts = by === "word" ? text.split(/(\s+)/) : Array.from(text);

  const container: Variants = {
    hidden: {},
    show: {
      transition: { delayChildren: delay, staggerChildren: stagger },
    },
  };

  const child: Variants = {
    hidden: { y: "110%", opacity: 0 },
    show: {
      y: "0%",
      opacity: 1,
      transition: { duration, ease: [0.19, 1, 0.22, 1] },
    },
  };

  const Comp = motion[as] as typeof motion.span;

  return (
    <Comp
      className={cn("inline-block overflow-x-visible overflow-y-hidden align-bottom pb-[0.22em]", className)}
      variants={container}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {parts.map((part, i) =>
        /^\s+$/.test(part) ? (
          <span key={i}> </span>
        ) : (
          <span key={i} className="inline-block overflow-x-visible overflow-y-hidden align-bottom pb-[0.22em]">
            <motion.span className="inline-block" variants={child}>
              {part}
            </motion.span>
          </span>
        ),
      )}
    </Comp>
  );
}
