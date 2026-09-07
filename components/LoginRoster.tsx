"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_ADMIN_ACCOUNTS,
  DEMO_ADMIN_PASSWORD,
  DEMO_CUSTOMER_ACCOUNTS,
  DEMO_CUSTOMER_PASSWORD,
} from "@/lib/demo-logins";

type LoginRosterProps = {
  highlight?: "admin" | "customer";
  onPick?: (username: string, password: string) => void;
};

function AccountList({
  title,
  password,
  accounts,
  accent,
  onPick,
}: {
  title: string;
  password: string;
  accounts: { username: string; label: string }[];
  accent: string;
  onPick?: (username: string, password: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 ${accent}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/55">
        {title}
      </p>
      <p className="mt-1 font-mono text-sm text-ink">
        รหัสผ่าน{" "}
        <span className="rounded bg-white/80 px-1.5 py-0.5 font-semibold">
          {password}
        </span>
      </p>
      <ul className="mt-2 space-y-1">
        {accounts.map((account) => (
          <li key={account.username}>
            <button
              type="button"
              onClick={() => onPick?.(account.username, password)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-sm transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono font-medium text-forest">
                {account.username}
              </span>
              <span className="text-xs text-ink/55">{account.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoginRoster({ highlight, onPick }: LoginRosterProps) {
  const [open, setOpen] = useState(false);

  function pick(username: string, password: string) {
    onPick?.(username, password);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto shrink-0 self-stretch rounded-md px-3"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Users />
        เลือกบัญชี
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(100%-1.5rem,36rem)]">
          <DialogHeader>
            <DialogTitle>เลือกบัญชีทดลอง</DialogTitle>
            <DialogDescription>
              กดชื่อผู้ใช้เพื่อใส่ชื่อและรหัสผ่านในฟอร์ม
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <AccountList
              title="ฝั่งผู้ดูแล"
              password={DEMO_ADMIN_PASSWORD}
              accounts={DEMO_ADMIN_ACCOUNTS}
              accent={
                highlight === "admin"
                  ? "border-forest/30 bg-forest/5"
                  : "border-line bg-cream/40"
              }
              onPick={pick}
            />
            <AccountList
              title="ฝั่งลูกค้า"
              password={DEMO_CUSTOMER_PASSWORD}
              accounts={DEMO_CUSTOMER_ACCOUNTS}
              accent={
                highlight === "customer"
                  ? "border-forest/30 bg-forest/5"
                  : "border-line bg-cream/40"
              }
              onPick={pick}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
