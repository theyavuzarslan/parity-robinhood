"use client";

import type { ReactNode, CSSProperties } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: "var(--surface)", border: "1px solid var(--border)", ...style }}>
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
      {children}
    </span>
  );
}

export function Chip({ active, onClick, children, mono = true }: { active: boolean; onClick: () => void; children: ReactNode; mono?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${mono ? "mono" : ""}`}
      style={{
        background: active ? "rgba(172,198,233,0.15)" : "var(--surface-muted)",
        border: active ? "1px solid rgba(172,198,233,0.40)" : "1px solid var(--border)",
        color: active ? "var(--accent)" : "var(--subtle)",
      }}
    >
      {children}
    </button>
  );
}

export function Button({
  onClick,
  disabled,
  children,
  tone = "primary",
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: "primary" | "ghost" | "success" | "danger";
  className?: string;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: "var(--accent)", color: "#0d1b2f" },
    ghost: { background: "var(--surface-muted)", border: "1px solid var(--border)", color: "var(--muted)" },
    success: { background: "rgba(141,216,159,0.15)", border: "1px solid rgba(141,216,159,0.35)", color: "var(--success)" },
    danger: { background: "rgba(232,109,122,0.12)", border: "1px solid rgba(232,109,122,0.30)", color: "var(--danger)" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={styles[tone]}
    >
      {children}
    </button>
  );
}

export const inputStyle: CSSProperties = {
  background: "var(--surface-muted)",
  border: "1px solid var(--border)",
  color: "var(--ink)",
};

export function NumberInput({ value, onChange, placeholder, suffix }: { value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.\-]/g, ""))}
        className="w-full mono text-sm rounded-xl px-3 py-2.5 outline-none"
        style={inputStyle}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--subtle)" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}
