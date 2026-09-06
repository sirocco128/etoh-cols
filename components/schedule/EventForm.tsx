"use client";

import { useMemo, useState } from "react";
import { TimeRangePicker } from "@/components/schedule/TimeRangePicker";
import { DeadlineSlotPicker } from "@/components/schedule/DeadlineSlotPicker";
import {
  bangkokLocalToUtcIso,
  bangkokYmdDash,
  formatMinuteLabel,
  parseHmToMinute,
} from "@/lib/bangkok-date";
import {
  SCHEDULE_KINDS,
  SCHEDULE_KIND_LABELS,
  SCHEDULE_STATUSES,
  SCHEDULE_STATUS_LABELS,
  type ScheduleAttendeeInput,
  type ScheduleEvent,
  type ScheduleKind,
  type ScheduleSlot,
  type ScheduleStatus,
} from "@/lib/schedule-types";
import { cn } from "@/lib/utils";

export type EventFormStaffOption = {
  email: string;
  name: string;
  staffId?: number;
};

export type EventFormValues = {
  kind: ScheduleKind;
  title: string;
  notes: string;
  ymd: string;
  startHm: string;
  endHm: string;
  status: ScheduleStatus;
  location: string;
  hostEmail: string;
  customerId: string;
  orderId: string;
  staffEmails: string[];
  externalEmails: string;
  notify: boolean;
};

function toAttendees(
  values: EventFormValues,
  staffOptions: EventFormStaffOption[],
): ScheduleAttendeeInput[] {
  const out: ScheduleAttendeeInput[] = [];
  const seen = new Set<string>();
  for (const email of values.staffEmails) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const staff = staffOptions.find((s) => s.email === normalized);
    out.push({
      role: "staff",
      email: normalized,
      name: staff?.name,
      staffId: staff?.staffId ?? null,
      notify: values.notify,
    });
  }
  const host = values.hostEmail.trim().toLowerCase();
  if (host && !seen.has(host)) {
    const staff = staffOptions.find((s) => s.email === host);
    out.push({
      role: "staff",
      email: host,
      name: staff?.name,
      staffId: staff?.staffId ?? null,
      notify: values.notify,
    });
  }
  for (const raw of values.externalEmails.split(/[,;\n]+/)) {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push({ role: "external", email, notify: values.notify });
  }
  return out;
}

export function buildEventPayload(values: EventFormValues, staffOptions: EventFormStaffOption[]) {
  const startMin = parseHmToMinute(values.startHm) ?? 9 * 60;
  const endMin = parseHmToMinute(values.endHm) ?? startMin + 30;
  return {
    kind: values.kind,
    title: values.title,
    notes: values.notes,
    startsAt: bangkokLocalToUtcIso(values.ymd, startMin),
    endsAt: bangkokLocalToUtcIso(values.ymd, endMin),
    status: values.status,
    location: values.location,
    hostEmail: values.hostEmail,
    customerId: values.customerId.trim() ? Number(values.customerId) : null,
    orderId: values.orderId.trim() || null,
    attendees: toAttendees(values, staffOptions),
  };
}

export function EventForm({
  mode,
  initial,
  staffOptions,
  slots,
  action,
  submitLabel,
  eventId,
}: {
  mode: "create" | "edit";
  initial: EventFormValues;
  staffOptions: EventFormStaffOption[];
  slots: ScheduleSlot[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  eventId?: string;
}) {
  const [values, setValues] = useState(initial);
  const [useSlots, setUseSlots] = useState(mode === "create");

  const payload = useMemo(
    () => buildEventPayload(values, staffOptions),
    [values, staffOptions],
  );

  function toggleStaff(email: string) {
    setValues((prev) => {
      const has = prev.staffEmails.includes(email);
      return {
        ...prev,
        staffEmails: has
          ? prev.staffEmails.filter((e) => e !== email)
          : [...prev.staffEmails, email],
      };
    });
  }

  return (
    <form action={action} className="space-y-5">
      {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
      <input type="hidden" name="kind" value={values.kind} />
      <input type="hidden" name="title" value={values.title} />
      <input type="hidden" name="notes" value={values.notes} />
      <input type="hidden" name="startsAt" value={payload.startsAt} />
      <input type="hidden" name="endsAt" value={payload.endsAt} />
      <input type="hidden" name="status" value={values.status} />
      <input type="hidden" name="location" value={values.location} />
      <input type="hidden" name="hostEmail" value={values.hostEmail} />
      <input type="hidden" name="customerId" value={values.customerId} />
      <input type="hidden" name="orderId" value={values.orderId} />
      <input
        type="hidden"
        name="attendeesJson"
        value={JSON.stringify(payload.attendees)}
      />
      <input type="hidden" name="notify" value={values.notify ? "1" : "0"} />

      <div className="rounded-2xl border border-forest/15 bg-paper p-5 shadow-sm">
        <h2 className="font-display text-xl text-forest">
          {mode === "create" ? "สร้างนัดหมาย" : "แก้ นัดหมาย"}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          เลือกประเภท ใส่หัวข้อ ผู้เข้าร่วม และช่วงเวลา — ระบบจะแจ้งเตือนทาง Gmail
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-1">
            <span className="mb-1 block text-forest/70">ประเภท</span>
            <select
              className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
              value={values.kind}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  kind: e.target.value as ScheduleKind,
                  title:
                    v.title.trim() === "" ||
                    Object.values(SCHEDULE_KIND_LABELS).includes(v.title)
                      ? SCHEDULE_KIND_LABELS[e.target.value as ScheduleKind]
                      : v.title,
                }))
              }
            >
              {SCHEDULE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {SCHEDULE_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">สถานะ</span>
            <select
              className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
              value={values.status}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  status: e.target.value as ScheduleStatus,
                }))
              }
            >
              {SCHEDULE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SCHEDULE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-forest/70">หัวข้อ</span>
            <input
              className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="ใส่หัวข้อนัดเองได้"
              required
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm text-forest/70">พนักงานที่เกี่ยวข้อง</div>
          <div className="flex flex-wrap gap-2">
            {staffOptions.map((staff) => {
              const selected = values.staffEmails.includes(staff.email);
              return (
                <button
                  key={staff.email}
                  type="button"
                  onClick={() => toggleStaff(staff.email)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    selected
                      ? "border-forest bg-forest text-paper"
                      : "border-forest/20 text-forest hover:border-brass/50",
                  )}
                >
                  {staff.name || staff.email}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-forest/70">
            อีเมลลูกค้า / ภายนอก (คั่นด้วย comma)
          </span>
          <textarea
            className="min-h-20 w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
            value={values.externalEmails}
            onChange={(e) =>
              setValues((v) => ({ ...v, externalEmails: e.target.value }))
            }
            placeholder="customer@company.com"
          />
        </label>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-forest/70">เจ้าของนัด (host)</span>
          <select
            className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
            value={values.hostEmail}
            onChange={(e) =>
              setValues((v) => ({ ...v, hostEmail: e.target.value }))
            }
          >
            {staffOptions.map((staff) => (
              <option key={staff.email} value={staff.email}>
                {staff.name} ({staff.email})
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              !useSlots
                ? "border-forest bg-forest text-paper"
                : "border-forest/20 text-forest",
            )}
            onClick={() => setUseSlots(false)}
          >
            เลือกเวลาเอง
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              useSlots
                ? "border-forest bg-forest text-paper"
                : "border-forest/20 text-forest",
            )}
            onClick={() => setUseSlots(true)}
          >
            เลือกจากช่องว่าง
          </button>
        </div>

        <div className="mt-4">
          {useSlots ? (
            <DeadlineSlotPicker
              slots={slots}
              selectedStartsAt={payload.startsAt}
              onSelect={(slot) => {
                setValues((v) => ({
                  ...v,
                  ymd: slot.ymd,
                  startHm: formatMinuteLabel(slot.startMinute),
                  endHm: formatMinuteLabel(slot.endMinute),
                }));
              }}
            />
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-forest/70">วันที่ (เวลาไทย)</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
                  value={values.ymd}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, ymd: e.target.value }))
                  }
                />
              </label>
              <TimeRangePicker
                startHm={values.startHm}
                endHm={values.endHm}
                onChange={({ startHm, endHm }) =>
                  setValues((v) => ({ ...v, startHm, endHm }))
                }
              />
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">สถานที่</span>
            <input
              className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
              value={values.location}
              onChange={(e) =>
                setValues((v) => ({ ...v, location: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">รหัสลูกค้า (ถ้ามี)</span>
            <input
              className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
              value={values.customerId}
              onChange={(e) =>
                setValues((v) => ({ ...v, customerId: e.target.value }))
              }
              inputMode="numeric"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-forest/70">หมายเหตุ</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-forest/20 bg-paper px-3 py-2"
              value={values.notes}
              onChange={(e) =>
                setValues((v) => ({ ...v, notes: e.target.value }))
              }
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={values.notify}
            onChange={(e) =>
              setValues((v) => ({ ...v, notify: e.target.checked }))
            }
          />
          ส่งอีเมลแจ้งเตือนผู้เกี่ยวข้องผ่าน Gmail
        </label>

        <div className="mt-5">
          <button
            type="submit"
            className="rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] shadow-sm hover:bg-brass-soft"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

export function eventToFormValues(event: ScheduleEvent): EventFormValues {
  const ymd = bangkokYmdDash(new Date(event.startsAt));
  const startParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(event.startsAt));
  const endParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(event.endsAt));
  const startHm = `${startParts.find((p) => p.type === "hour")?.value}:${startParts.find((p) => p.type === "minute")?.value}`;
  const endHm = `${endParts.find((p) => p.type === "hour")?.value}:${endParts.find((p) => p.type === "minute")?.value}`;
  return {
    kind: event.kind,
    title: event.title,
    notes: event.notes || "",
    ymd,
    startHm,
    endHm,
    status: event.status,
    location: event.location || "",
    hostEmail: event.hostEmail,
    customerId: event.customerId ? String(event.customerId) : "",
    orderId: event.orderId || "",
    staffEmails: event.attendees
      .filter((a) => a.role === "staff")
      .map((a) => a.email),
    externalEmails: event.attendees
      .filter((a) => a.role === "external")
      .map((a) => a.email)
      .join(", "),
    notify: true,
  };
}
