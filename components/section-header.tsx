import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  sticky?: boolean;
  actions?: ReactNode;
}

export function SectionHeader({ title, subtitle, sticky, actions }: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-slate-100 pb-3 ${
        sticky ? "sticky top-20 z-10 bg-white/90 backdrop-blur" : ""
      }`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</p>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
