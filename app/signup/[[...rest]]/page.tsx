"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen bg-[#050815] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-25%] top-[-20%] h-72 w-72 rounded-full bg-cyan-400/20 blur-[130px]" />
        <div className="absolute right-[-15%] bottom-[-10%] h-80 w-80 rounded-full bg-violet-500/20 blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-[36px] border border-white/10 bg-gradient-to-b from-[#111836] via-[#0d1834] to-[#081021] p-6 sm:p-9 backdrop-blur-2xl shadow-[0_35px_80px_rgba(1,5,22,0.75)]">
          <div className="text-center">
            <p className="text-[0.65rem] uppercase tracking-[0.45em] text-slate-400">Welcome</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Create your free account</h2>
            <p className="mt-2 text-sm text-slate-300">
              Start completing your tasks before they vanish. No friction — just fast, focused productivity.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b1122]/70 p-5 sm:p-6 shadow-[inset_0_18px_35px_rgba(4,7,15,0.75)]">
            <SignUp
              path="/signup"
              routing="path"
              signInUrl="/login"
              afterSignUpUrl="/home"
              afterSignInUrl="/home"
              appearance={{
                layout: {
                  socialButtonsPlacement: "top",
                  socialButtonsVariant: "iconButton",
                },
                elements: {
                  rootBox: "w-full",
                  main: "w-full",
                  card: "bg-transparent border-0 shadow-none p-0 w-full",
                  cardBox: "w-full",
                  content: "w-full",
                  form: "w-full flex flex-col gap-4",
                  formFields: "w-full flex flex-col gap-4",
                  formButtonPrimary:
                    "bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500 text-slate-900 font-semibold rounded-xl border-0 shadow-[0_10px_25px_rgba(56,189,248,0.35)] hover:opacity-95 transition",
                  headerTitle: "text-white text-xl font-semibold mb-1",
                  headerSubtitle: "text-slate-400 text-sm",
                  formFieldLabel: "text-slate-300",
                  formFieldInput:
                    "bg-white/5 border border-white/15 text-white placeholder:text-slate-400 rounded-xl focus:border-cyan-400/60 focus:ring-0",
                  footerAction: "text-sm text-slate-400",
                  footerActionLink: "text-cyan-300 hover:text-cyan-200",
                  footer: "mt-6 pt-4 border-t border-white/10",
                  socialButtonsBlockButton:
                    "rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition",
                  socialButtonsIconButton:
                    "rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition",
                  dividerLine: "bg-white/10",
                  dividerText: "text-slate-500",
                  verificationCode__letterInput:
                    "rounded-xl border border-white/30 bg-[#080f23] text-white focus:border-cyan-400/70 focus:ring-0",
                },
                variables: {
                  colorPrimary: "#a5f3fc",
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
