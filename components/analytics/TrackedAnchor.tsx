"use client";

import { track } from "@vercel/analytics";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

/**
 * Drop-in <a> replacement that fires a Vercel custom event before the
 * browser navigates. Use for tel:, mailto: and external https links —
 * Next.js's <Link> handles internal nav and has its own wrapper below.
 *
 * The event/location pair shows up in Vercel Analytics under Custom
 * Events. Keep the `location` value low-cardinality (a handful of
 * named placements) so the breakdown stays readable.
 */
type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string;
  location: string;
  children: ReactNode;
};

export function TrackedAnchor({
  event,
  location,
  onClick,
  children,
  ...rest
}: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // Fire-and-forget — the SDK queues this even if the page is about
    // to navigate away, so it doesn't block the link's default action.
    track(event, { location });
    onClick?.(e);
  }

  return (
    <a {...rest} onClick={handleClick}>
      {children}
    </a>
  );
}
