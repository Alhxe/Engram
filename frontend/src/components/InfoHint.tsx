import { HelpCircle } from "lucide-react";

/** A small "?" that reveals a one-line explanation on hover or focus. */
export default function InfoHint({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`group/hint relative inline-flex align-middle ${className}`}>
      <HelpCircle
        className="h-3.5 w-3.5 cursor-help text-dim transition hover:text-mid"
        strokeWidth={1.75}
        tabIndex={0}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-line2 bg-elev px-2.5 py-1.5 text-[12px] font-normal normal-case leading-snug tracking-normal text-mid opacity-0 shadow-xl shadow-black/30 transition-opacity duration-150 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
