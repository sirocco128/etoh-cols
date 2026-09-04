/**
 * Client-side logo mockup: geometry helpers and quote-brief copy.
 * Preview only — files stay in the browser and are not a production proof.
 */

export const MOCKUP_BRIEF_EVENT = "giftpro:mockup-brief";

export type MockupBriefEventDetail = {
  text: string;
};

export type MockupSurfaceId = "tumbler" | "notebook" | "pen";

export type MockupSurfaceKind = "cylinder" | "cover" | "pen";

export type MockupSurface = {
  id: MockupSurfaceId;
  label: string;
  kind: MockupSurfaceKind;
  hint: string;
};

export type MockupFinish = {
  id: string;
  label: string;
  body: string;
  accent: string;
};

export type MockupOverlayType = "image" | "text" | "file";

export type MockupOverlay = {
  id: string;
  type: MockupOverlayType;
  label: string;
  src?: string;
  text?: string;
  color?: string;
  /** Unwrap / cover left edge, 0–1. Cylinder u wraps around. */
  u: number;
  /** Top edge, 0–1 along the printable height. */
  v: number;
  w: number;
  h: number;
};

export const TUMBLER_SET_SURFACES: MockupSurface[] = [
  {
    id: "tumbler",
    label: "กระบอกน้ำ",
    kind: "cylinder",
    hint: "สแตนเลส — โลโก้พันรอบตัวขวด",
  },
  {
    id: "notebook",
    label: "สมุดโน้ต",
    kind: "cover",
    hint: "ปกหนัง PU — วางบนหน้าปก",
  },
  {
    id: "pen",
    label: "ปากกา",
    kind: "pen",
    hint: "ลำกล้อง — หมุนดูคลิปและปลายปากกา",
  },
];

export const MOCKUP_FINISHES: MockupFinish[] = [
  { id: "stainless", label: "สแตนเลส", body: "#c5cdd4", accent: "#8e98a3" },
  { id: "black", label: "ดำด้าน", body: "#2c3036", accent: "#1a1d22" },
  { id: "white", label: "ขาวงาช้าง", body: "#f3efe6", accent: "#d9d3c6" },
  { id: "forest", label: "เขียวป่า", body: "#1e4a3a", accent: "#14352a" },
  { id: "navy", label: "กรมท่า", body: "#1c2d4d", accent: "#121c33" },
  { id: "brass", label: "ทองเหลือง", body: "#b08a3e", accent: "#8a6a2c" },
];

export const MOCKUP_MAX_FILE_BYTES = 8 * 1024 * 1024;

export const MOCKUP_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export function getSurfacesForProduct(slug: string): MockupSurface[] | null {
  if (slug === "tumbler-notebook-pen-set") return TUMBLER_SET_SURFACES;
  return null;
}

export function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Visible front column nx ∈ [-1, 1] → unwrap u, with the object yaw in degrees. */
export function cylinderColumnToU(nx: number, rotationDeg: number): number {
  const clamped = clamp(nx, -1, 1);
  const z = Math.sqrt(Math.max(0, 1 - clamped * clamped));
  const theta = Math.atan2(clamped, z);
  const rot = (rotationDeg * Math.PI) / 180;
  return wrapUnit(0.5 + (theta - rot) / (Math.PI * 2));
}

export function cylinderUvToScreen(
  u: number,
  v: number,
  rotationDeg: number,
  layout: { cx: number; radius: number; bodyTop: number; bodyH: number },
): { x: number; y: number; z: number; visible: boolean } {
  const rot = (rotationDeg * Math.PI) / 180;
  const world = (u - 0.5) * Math.PI * 2 + rot;
  const nx = Math.sin(world);
  const z = Math.cos(world);
  return {
    x: layout.cx + nx * layout.radius,
    y: layout.bodyTop + v * layout.bodyH,
    z,
    visible: z > 0.04,
  };
}

export function unitInRangeWrapped(u: number, start: number, width: number): boolean {
  if (width >= 1) return true;
  return wrapUnit(u - start) <= width;
}

export function overlayCoversUv(
  overlay: Pick<MockupOverlay, "u" | "v" | "w" | "h">,
  u: number,
  v: number,
  wrapped: boolean,
): boolean {
  if (v < overlay.v || v > overlay.v + overlay.h) return false;
  if (wrapped) return unitInRangeWrapped(u, overlay.u, overlay.w);
  return u >= overlay.u && u <= overlay.u + overlay.w;
}

export function clampOverlay(
  overlay: MockupOverlay,
  kind: MockupSurfaceKind,
): MockupOverlay {
  const h = clamp(overlay.h, 0.06, 0.72);
  const w =
    kind === "cover"
      ? clamp(overlay.w, 0.08, 0.92)
      : clamp(overlay.w, 0.08, 0.62);
  const v = clamp(overlay.v, 0, 1 - h);
  if (kind === "cover") {
    return {
      ...overlay,
      w,
      h,
      v,
      u: clamp(overlay.u, 0, 1 - w),
    };
  }
  return { ...overlay, w, h, v, u: wrapUnit(overlay.u) };
}

export function buildMockupBrief(input: {
  productName: string;
  surfaceLabel: string;
  colorLabel: string;
  rotationDeg: number;
  overlays: Array<Pick<MockupOverlay, "type" | "label" | "text">>;
}): string {
  const lines = [
    "ตัวอย่างการวางโลโก้บนหน้าเว็บ (ยังไม่ใช่แบบผลิต)",
    `สินค้า: ${input.productName}`,
    `แม่แบบ: ${input.surfaceLabel}`,
    `สีวัสดุ: ${input.colorLabel}`,
    `มุมหมุนล่าสุด: ${Math.round(input.rotationDeg) % 360}° จาก 360°`,
  ];
  if (input.overlays.length === 0) {
    lines.push("ยังไม่มีโลโก้หรือข้อความบนแม่แบบ");
  } else {
    lines.push("รายการบนแม่แบบ:");
    for (const overlay of input.overlays) {
      if (overlay.type === "text") {
        lines.push(`- ข้อความ: ${overlay.text || overlay.label}`);
      } else if (overlay.type === "file") {
        lines.push(`- ไฟล์แนบ: ${overlay.label}`);
      } else {
        lines.push(`- รูปโลโก้: ${overlay.label}`);
      }
    }
  }
  lines.push(
    "ไฟล์ยังอยู่บนเครื่องนี้ กรุณาส่งไฟล์โลโก้จริงให้ทีมขายทางอีเมลหรือ LINE",
  );
  return lines.join("\n").slice(0, 1800);
}

export function isMockupImageFile(file: Pick<File, "type" | "name">): boolean {
  if (MOCKUP_IMAGE_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}
