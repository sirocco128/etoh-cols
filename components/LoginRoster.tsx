"use client";

import { useState } from "react";
import { KeyRound, Users } from "lucide-react";
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
  type DemoLoginAccount,
} from "@/lib/demo-logins";

type RosterSide = "admin" | "customer";

type LoginRosterProps = {
  highlight?: RosterSide;
  sides?: RosterSide | "both";
  variant?: "dialog" | "inline";
  onPick?: (username: string, password: string) => void;
};

function passwordFor(side: RosterSide): string {
  return side === "admin" ? DEMO_ADMIN_PASSWORD : DEMO_CUSTOMER_PASSWORD;
}

function accountsFor(side: RosterSide): DemoLoginAccount[] {
  return side === "admin" ? DEMO_ADMIN_ACCOUNTS : DEMO_CUSTOMER_ACCOUNTS;
}

function AccountList({
  title,
  password,
  accounts,
  accent,
  onPick,
}: {
  title: string;
  password: string;
  accounts: DemoLoginAccount[];
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
        <span className="rounded bg-paper px-1.5 py-0.5 font-semibold">
          {password}
        </span>
      </p>
      <ul className="mt-2 space-y-1">
        {accounts.map((account) => (
          <li key={account.username}>
            <button
              type="button"
              onClick={() => onPick?.(account.username, password)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm transition hover:bg-paper/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function RosterLists({
  highlight,
  sides,
  onPick,
}: {
  highlight: RosterSide;
  sides: RosterSide | "both";
  onPick?: (username: string, password: string) => void;
}) {
  const showAdmin = sides === "both" || sides === "admin";
  const showCustomer = sides === "both" || sides === "customer";

  return (
    <div className={sides === "both" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
      {showAdmin ? (
        <AccountList
          title="ฝั่งผู้ดูแล"
          password={DEMO_ADMIN_PASSWORD}
          accounts={DEMO_ADMIN_ACCOUNTS}
          accent={
            highlight === "admin"
              ? "border-forest/30 bg-forest-mist/60"
              : "border-forest/15 bg-paper"
          }
          onPick={onPick}
        />
      ) : null}
      {showCustomer ? (
        <AccountList
          title="ฝั่งลูกค้า"
          password={DEMO_CUSTOMER_PASSWORD}
          accounts={DEMO_CUSTOMER_ACCOUNTS}
          accent={
            highlight === "customer"
              ? "border-forest/30 bg-forest-mist/60"
              : "border-forest/15 bg-paper"
          }
          onPick={onPick}
        />
      ) : null}
    </div>
  );
}

export function FillUserPasswordButton({
  side,
  username,
  onPick,
}: {
  side: RosterSide;
  username: string;
  onPick: (username: string, password: string) => void;
}) {
  const password = passwordFor(side);
  const known = accountsFor(side).some((account) => account.username === username);
  const fillUser = known ? username : accountsFor(side)[0]?.username ?? username;

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-md"
      onClick={() => onPick(fillUser, password)}
    >
      <KeyRound />
      ใส่ชื่อผู้ใช้และรหัสผ่าน
    </Button>
  );
}

export function LoginRoster({
  highlight = "admin",
  sides = "both",
  variant = "dialog",
  onPick,
}: LoginRosterProps) {
  const [open, setOpen] = useState(false);
  const resolvedSides = sides === "both" ? "both" : sides;

  function pick(username: string, password: string) {
    onPick?.(username, password);
    setOpen(false);
  }

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border border-forest/15 bg-forest-mist/40 p-3 sm:p-4">
        <p className="text-sm font-semibold text-forest">บัญชีทดลอง</p>
        <p className="mt-0.5 text-xs text-ink/65">
          กดชื่อผู้ใช้เพื่อใส่ชื่อและรหัสผ่านในฟอร์มพร้อมกัน
        </p>
        <div className="mt-3">
          <RosterLists highlight={highlight} sides={resolvedSides} onPick={pick} />
        </div>
      </div>
    );
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
          <RosterLists highlight={highlight} sides={resolvedSides} onPick={pick} />
        </DialogContent>
      </Dialog>
    </>
  );
}
