"use client";

// Client-side Mermaid mount for Ops work manuals.
// Source HTML comes from trusted docs/*.md (not end-user input).

import { useEffect, useId, useRef } from "react";

const THEME_VARS = {
  darkMode: false,
  background: "#f7f4ef",
  primaryColor: "#e4efe9",
  primaryTextColor: "#14352a",
  primaryBorderColor: "#1e4a3a",
  secondaryColor: "#f0ebe3",
  tertiaryColor: "#d7e6de",
  lineColor: "#9a7b3c",
  textColor: "#1a2e26",
  mainBkg: "#e4efe9",
  nodeBorder: "#1e4a3a",
  clusterBkg: "#f0ebe3",
  titleColor: "#14352a",
  edgeLabelBackground: "#f7f4ef",
  fontFamily:
    '"Segoe UI", "Sarabun", ui-sans-serif, system-ui, sans-serif',
  fontSize: "14px",
};

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: THEME_VARS,
        flowchart: { curve: "basis", htmlLabels: true, padding: 16 },
        er: {
          diagramPadding: 24,
          layoutDirection: "TB",
          minEntityWidth: 140,
          minEntityHeight: 80,
          entityPadding: 16,
          useMaxWidth: true,
        },
        sequence: { mirrorActors: false, useMaxWidth: true },
      });
      return mermaid;
    });
  }
  return mermaidReady;
}

export function OpsMermaidHost({
  root,
  revision,
}: {
  root: HTMLElement | null;
  revision: string;
}) {
  const renderPass = useId();
  const running = useRef(0);

  useEffect(() => {
    if (!root) return;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>('.ops-mermaid[data-rendered="false"]'),
    );
    if (!nodes.length) return;

    const pass = ++running.current;
    let cancelled = false;

    (async () => {
      const mermaid = await loadMermaid();
      if (cancelled || pass !== running.current) return;

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!node || cancelled) return;

        const sourceEl = node.querySelector(".ops-mermaid-source");
        const canvas = node.querySelector(".ops-mermaid-canvas");
        const fallback = node.querySelector(".ops-mermaid-fallback");
        const source = sourceEl?.textContent?.trim() || "";
        if (!canvas || !source) continue;

        const diagramId = `ops-mmd-${renderPass.replace(/:/g, "")}-${i}`;
        try {
          const { svg } = await mermaid.render(diagramId, source);
          if (cancelled || pass !== running.current) return;
          canvas.innerHTML = svg;
          const svgEl = canvas.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.setAttribute("role", "img");
          }
          node.dataset.rendered = "true";
          if (fallback) {
            fallback.classList.add("hidden");
            fallback.setAttribute("hidden", "");
            fallback.textContent = "";
          }
        } catch (err) {
          if (cancelled) return;
          node.dataset.rendered = "error";
          if (fallback) {
            fallback.classList.remove("hidden");
            fallback.removeAttribute("hidden");
            fallback.textContent =
              err instanceof Error
                ? `เรนเดอร์ไดอะแกรมไม่สำเร็จ: ${err.message}`
                : "เรนเดอร์ไดอะแกรมไม่สำเร็จ";
          }
        }
      }
    })().catch(() => {
      /* import failure surfaced per-node above when possible */
    });

    return () => {
      cancelled = true;
    };
  }, [root, revision, renderPass]);

  return null;
}
