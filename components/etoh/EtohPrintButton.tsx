"use client";

export function EtohPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-forest/30 px-3 py-1.5 text-sm text-forest print:hidden"
    >
      พิมพ์ / บันทึก PDF
    </button>
  );
}
