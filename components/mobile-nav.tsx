"use client";

type NavKey = "home" | "archive" | "stats";

interface MobileNavProps {
  active?: NavKey;
}

const NAV_ITEMS: { key: NavKey; label: string; href: string; icon: JSX.Element }[] = [
  {
    key: "home",
    label: "Home",
    href: "/home",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10.5V20h14v-9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "archive",
    label: "Archive",
    href: "/archive",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "stats",
    label: "Stats",
    href: "/stats",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M6 18v-6m6 6V6m6 12V9" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function MobileNav({ active = "home" }: MobileNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center sm:hidden">
      <nav className="flex items-center justify-between gap-6 rounded-[999px] border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <a
              key={item.key}
              href={item.href}
              className="flex flex-col items-center text-[11px] font-medium text-slate-400"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
                  isActive ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-slate-50" : "bg-white/5"
                }`}
              >
                {item.icon}
              </span>
              <span className={`mt-1 ${isActive ? "text-slate-50" : "text-slate-400"}`}>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
