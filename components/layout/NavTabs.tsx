"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/archive", label: "Archive" },
  { href: "/stats", label: "Stats" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-2 text-sm lg:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
              active ? "bg-white/10 text-slate-50 shadow-[0_12px_35px_rgba(0,0,0,0.45)]" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
