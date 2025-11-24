"use client";

import { SignedIn, SignedOut, SignOutButton, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LandingClockIcon } from "@/app/page";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/archive", label: "Archive" },
  { href: "/stats", label: "Stats" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050814]/90 px-4 py-4 backdrop-blur lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LandingClockIcon size={36} />
          <p className="text-lg font-semibold text-white">Taskonate</p>
        </div>
        <div className="hidden items-center gap-4 lg:flex">
          <nav className="flex items-center gap-3 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
                    active
                      ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <SignedIn>
            <div className="flex items-center gap-3">
              <SignOutButton>
                <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring focus-visible:ring-cyan-400/60">
                  Log out
                </button>
              </SignOutButton>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-10 w-10" } }} />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_25px_rgba(56,189,248,0.25)] transition hover:opacity-95">
                Login
              </button>
            </SignInButton>
          </SignedOut>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <SignedIn>
            <SignOutButton>
              <button className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring focus-visible:ring-cyan-400/60">
                Log out
              </button>
            </SignOutButton>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10">
                Login
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
