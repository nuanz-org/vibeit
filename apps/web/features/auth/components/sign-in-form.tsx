"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

const card =
  "w-full max-w-[400px] rounded-[12px] border border-border bg-card p-8";
const title = "mb-1.5 text-2xl font-medium tracking-[-0.03em]";
const subtitle = "mb-6 text-[0.95rem] leading-snug text-ink/70";
const form = "flex flex-col gap-4";
const field = "flex flex-col gap-1.5";
const label = "text-[0.85rem] font-medium";
const input =
  "w-full appearance-none rounded-[10px] border border-border bg-background px-3 py-2.5 text-[0.95rem] text-foreground transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-primary/50 focus:shadow-[0_0_0_3px_rgb(0_0_255/0.12)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
const submit =
  "mt-1 h-12 cursor-pointer rounded-full border-none bg-primary px-4 text-[0.95rem] font-medium text-primary-foreground transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-base-blue-hover disabled:cursor-not-allowed disabled:opacity-55";
const error =
  "rounded-[10px] border border-[#FC401F]/25 bg-[#FC401F]/10 px-3 py-2.5 text-sm leading-snug text-[#FC401F]";
const footer = "mt-5 text-center text-sm text-muted-foreground";
const link = "font-medium text-primary underline underline-offset-2 hover:opacity-80";
const mutedLink =
  "text-[0.8rem] text-muted-foreground underline underline-offset-2 hover:text-foreground";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/create";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.status === 403) {
        setErrorMsg("Please verify your email address before signing in.");
        return;
      }
      setErrorMsg(signInError.message || "Could not sign in. Check your credentials.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className={card}>
      <div className="mb-5 flex items-center gap-2.5">
        <span
          className="inline-block size-6 shrink-0 rounded-[2px] bg-primary"
          aria-hidden
        />
        <p className="m-0 text-[15px] font-medium tracking-[-0.02em]">Aiditr</p>
      </div>
      <h1 className={title}>Sign in</h1>
      <p className={subtitle}>
        Use your email and password to continue to Create.
      </p>

      <form className={form} onSubmit={onSubmit}>
        {errorMsg ? (
          <div className={error} role="alert">
            {errorMsg}
          </div>
        ) : null}

        <div className={field}>
          <label className={label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={loading}
          />
        </div>

        <div className={field}>
          <div className="flex items-center justify-between gap-2">
            <label className={label} htmlFor="password">
              Password
            </label>
            <Link className={mutedLink} href="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            className={input}
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={loading}
          />
        </div>

        <button className={submit} type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className={footer}>
        No account?{" "}
        <Link
          className={link}
          href={
            next && next !== "/create"
              ? `/signup?next=${encodeURIComponent(next)}`
              : "/signup"
          }
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
