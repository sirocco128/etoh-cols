import type { EtohPackCode } from "@/lib/etoh/catalog";

/** Flat illustrations for packaging (poster style: blue drums, white IBC, ISO frame). */
export function PackIllustration({ code, className = "h-24 w-24" }: { code: EtohPackCode; className?: string }) {
  switch (code) {
    case "ISO25000":
      return (
        <svg viewBox="0 0 120 80" className={className} aria-hidden>
          <rect x="4" y="10" width="112" height="60" rx="3" fill="none" stroke="#0a2a66" strokeWidth="4" />
          <path d="M4 10l20 30L4 70M116 10L96 40l20 30" fill="none" stroke="#0a2a66" strokeWidth="3" />
          <rect x="22" y="18" width="76" height="44" rx="22" fill="url(#iso-g)" stroke="#9fb3cf" strokeWidth="1.5" />
          <rect x="54" y="12" width="12" height="7" rx="2" fill="#9fb3cf" />
          <defs>
            <linearGradient id="iso-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".55" stopColor="#e3eaf4" />
              <stop offset="1" stopColor="#b9c7da" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "IBC1000":
      return (
        <svg viewBox="0 0 90 90" className={className} aria-hidden>
          <rect x="8" y="12" width="74" height="62" rx="4" fill="#f4f7fb" stroke="#8a97a8" strokeWidth="2" />
          {[23, 38, 53, 68].map((x) => (
            <line key={`v${x}`} x1={x} y1="12" x2={x} y2="74" stroke="#8a97a8" strokeWidth="2" />
          ))}
          {[27, 43, 59].map((y) => (
            <line key={`h${y}`} x1="8" y1={y} x2="82" y2={y} stroke="#8a97a8" strokeWidth="2" />
          ))}
          <rect x="38" y="6" width="14" height="7" rx="2" fill="#0a2a66" />
          <rect x="4" y="74" width="82" height="10" rx="2" fill="#374151" />
          <rect x="12" y="84" width="10" height="4" fill="#374151" />
          <rect x="68" y="84" width="10" height="4" fill="#374151" />
        </svg>
      );
    case "DRUM200":
      return (
        <svg viewBox="0 0 70 90" className={className} aria-hidden>
          <defs>
            <linearGradient id="drum-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0d4fb8" />
              <stop offset=".45" stopColor="#2f7df0" />
              <stop offset="1" stopColor="#0b3f95" />
            </linearGradient>
          </defs>
          <ellipse cx="35" cy="10" rx="27" ry="6" fill="#1c5fd0" />
          <path d="M8 10v70c0 3.3 12 6 27 6s27-2.7 27-6V10c0 3.3-12 6-27 6S8 13.3 8 10Z" fill="url(#drum-g)" />
          <path d="M8 34c0 3.3 12 6 27 6s27-2.7 27-6M8 58c0 3.3 12 6 27 6s27-2.7 27-6" fill="none" stroke="#0a2f73" strokeWidth="2.5" />
          <ellipse cx="44" cy="9" rx="4" ry="1.6" fill="#0a2f73" />
          <path d="M16 18v58" stroke="#ffffff" strokeOpacity=".25" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "GAL20":
    case "GAL5":
      return (
        <svg viewBox="0 0 70 90" className={className} aria-hidden>
          <path
            d={code === "GAL20" ? "M12 22h46a4 4 0 0 1 4 4v56a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4Z" : "M16 34h38a4 4 0 0 1 4 4v44a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V38a4 4 0 0 1 4-4Z"}
            fill="#ffffff"
            stroke="#b6c2d2"
            strokeWidth="2"
          />
          <rect x={code === "GAL20" ? 40 : 38} y={code === "GAL20" ? 12 : 25} width="12" height="10" rx="2" fill="#dbe3ee" stroke="#b6c2d2" />
          <path
            d={code === "GAL20" ? "M16 22c0-7 4-10 10-10h8" : "M20 34c0-6 3-8 8-8h6"}
            fill="none"
            stroke="#b6c2d2"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect x={code === "GAL20" ? 18 : 20} y={code === "GAL20" ? 44 : 52} width={code === "GAL20" ? 34 : 30} height="18" rx="2" fill="#1553b7" />
          <text x="35" y={code === "GAL20" ? 57 : 65} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">
            {code === "GAL20" ? "20 L" : "5 L"}
          </text>
        </svg>
      );
  }
}

export function GradeIcon({ accent, className = "h-16 w-16" }: { accent: "blue" | "leaf" | "orange" | "rose"; className?: string }) {
  if (accent === "blue") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <path d="M24 6h16M27 6v16L12 50a6 6 0 0 0 5.3 8.8h29.4A6 6 0 0 0 52 50L37 22V6" fill="#fff" stroke="#1553b7" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M16.5 42h31L52 50a6 6 0 0 1-5.3 8.8H17.3A6 6 0 0 1 12 50Z" fill="#2f7df0" />
        <circle cx="28" cy="48" r="2" fill="#fff" fillOpacity=".7" />
        <circle cx="36" cy="52" r="1.5" fill="#fff" fillOpacity=".7" />
      </svg>
    );
  }
  if (accent === "leaf") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <path d="M12 14h34v38a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" fill="#fff" stroke="#1553b7" strokeWidth="2.5" />
        <path d="M12 32h34v20a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" fill="#6fb4ff" />
        <path d="M58 22C46 22 40 29 40 38c0 2 .4 3.6 1 5 1.5-6 5-10 11-12-4.5 3-7.5 7-9 12 11 0 15-9 15-21Z" fill="#1f9d55" />
      </svg>
    );
  }
  if (accent === "orange") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <g stroke="#0a2a66" strokeWidth="3">
          <line x1="18" y1="44" x2="32" y2="20" />
          <line x1="32" y1="20" x2="48" y2="34" />
          <line x1="48" y1="34" x2="40" y2="52" />
        </g>
        <circle cx="18" cy="44" r="7" fill="#1553b7" />
        <circle cx="32" cy="20" r="7" fill="#1553b7" />
        <circle cx="48" cy="34" r="6" fill="#1553b7" />
        <circle cx="40" cy="52" r="5" fill="#1553b7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="26" fill="#fff" stroke="#1553b7" strokeWidth="3" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#1553b7" strokeWidth="1.5" strokeDasharray="2 3" />
      <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1553b7">
        อย.
      </text>
    </svg>
  );
}

export function LeafMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M20 3C10 3 4 8.5 4 16c0 1.8.4 3.4 1 5 1-5 4.5-9 10-11-4 3-7 6.5-8.5 11 9 .5 13.5-6 13.5-18Z" className="fill-leaf" />
    </svg>
  );
}

/** Line icons for the four pillars. */
export function PillarIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "quality":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "supply":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M3 10 12 4l9 6v10H3Z" />
          <path d="M7 20v-6h10v6M7 17h10" />
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M2 6h11v10H2zM13 9h4l3 3v4h-7" />
          <circle cx="6" cy="17.5" r="1.8" />
          <circle cx="17" cy="17.5" r="1.8" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M16 14c2.8 0 5 2.2 5 5" />
        </svg>
      );
    case "doc":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M6 3h8l4 4v14H6Z" />
          <path d="M14 3v4h4M9 12h6M9 16h6" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}
