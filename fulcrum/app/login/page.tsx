"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/landing/Wordmark";

const AUTH_KEY = "operon_demo_auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-paper" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next") || "/demo";

  useEffect(() => {
    if (window.localStorage.getItem(AUTH_KEY) === "true") {
      router.replace(next);
    }
  }, [next, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expected = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "operon";
    if (passcode.trim() !== expected) {
      setError("Incorrect demo passcode.");
      return;
    }
    window.localStorage.setItem(AUTH_KEY, "true");
    router.replace(next);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <Wordmark />
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-70" />
      <section className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-[1480px] items-center px-8 py-16">
        <div className="grid overflow-hidden border border-ink bg-paper shadow-[12px_12px_0_rgba(22,20,15,0.08)] lg:grid-cols-[1fr_420px]">
          <div className="border-b border-ink p-8 lg:border-b-0 lg:border-r lg:p-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-rust">
              Demo access
            </div>
            <h1 className="mt-5 max-w-[10ch] font-display text-[64px] leading-[0.92] tracking-tight sm:text-[88px]">
              Open the compiler.
            </h1>
            <p className="mt-7 max-w-[56ch] font-display text-[19px] leading-[1.5] text-ink-soft">
              The landing page is public. The working demo is behind a basic local passcode so the presentation opens cleanly and the compiler state stays intentional.
            </p>
            <div className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-3">
              <LoginSignal label="Source retrieval" value="Tavily plus RAG" />
              <LoginSignal label="Compiler output" value="Steps plus decisions" />
              <LoginSignal label="Run memory" value="Trace plus feedback" />
            </div>
          </div>

          <form onSubmit={submit} className="p-8 lg:p-10">
            <div className="flex h-12 w-12 items-center justify-center border border-ink bg-ink text-paper">
              <LockKeyhole className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <label className="mt-8 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Demo passcode
              </span>
              <input
                value={passcode}
                onChange={(event) => {
                  setPasscode(event.target.value);
                  setError(null);
                }}
                type="password"
                autoFocus
                className="mt-2 w-full border border-ink bg-paper-deep/45 px-4 py-3 font-mono text-[14px] tracking-[0.08em] outline-none focus:border-rust"
                placeholder="Enter passcode"
              />
            </label>
            {error && <p className="mt-3 font-display text-[14px] leading-[1.45] text-rust">{error}</p>}
            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust"
            >
              Enter demo
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <p className="mt-5 border-t border-rule pt-4 font-display text-[13px] leading-[1.5] text-ink-soft">
              Default local passcode is <span className="font-mono text-[11px]">operon</span>. Set <span className="font-mono text-[11px]">NEXT_PUBLIC_DEMO_PASSWORD</span> to override it.
            </p>
            <Link href="/" className="mt-6 inline-flex font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink">
              Back to landing
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

function LoginSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">{label}</div>
      <div className="mt-2 font-display text-[16px] leading-tight text-ink">{value}</div>
    </div>
  );
}
