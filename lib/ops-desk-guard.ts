/** Session watermark + desk-guard copy for the ops console. */

import { BANGKOK_TZ } from "@/lib/bangkok-date";

export function formatOpsDeskStamp(now = new Date()): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BANGKOK_TZ,
  }).format(now);
}

export function opsDeskUserLine(actor: { email: string; name: string }): string {
  const name = actor.name.trim();
  const email = actor.email.trim();
  if (name && name.toLowerCase() !== email.toLowerCase()) {
    return `${name} · ${email}`;
  }
  return email;
}

export function opsDeskWatermarkLine(
  userLine: string,
  now = new Date(),
): string {
  return `${userLine.trim()} · ${formatOpsDeskStamp(now)}`;
}

export function isOpsDeskContextMenuTarget(target: EventTarget | null): boolean {
  if (!target || typeof Element === "undefined") return false;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}
