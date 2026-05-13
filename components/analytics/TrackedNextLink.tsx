"use client";

import Link, { type LinkProps } from "next/link";
import { track } from "@vercel/analytics";
import type { MouseEvent, ReactNode } from "react";

/**
 * Next.js <Link> with a Vercel custom event fired on click. Use this
 * for internal navigations we want to count separately from page
 * views — typically devis CTAs spread across hero / header / footer,
 * where the *placement* of the click is the actionable signal.
 */
type Props = LinkProps & {
  event: string;
  location: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export function TrackedNextLink({
  event,
  location,
  onClick,
  children,
  ...rest
}: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    track(event, { location });
    onClick?.(e);
  }

  return (
    <Link {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}
