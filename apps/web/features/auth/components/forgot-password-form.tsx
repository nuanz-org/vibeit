"use client";

import Link from "next/link";
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
const success =
  "rounded-[10px] border border-[#66C800]/25 bg-[#66C800]/10 px-3 py-2.5 text-sm leading-snug text-[#2a7a4b]";
const footer = "mt-5 text-center text-sm text-muted-foreground";
const link = "font-medium text-primary underline underline-offset-2 hover:opacity-80";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setErrorMsg(resetError.message || "Could not send reset email.");
      return;
    }

    setSent(true);
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
      <h1 className={title}>Reset password</h1>
      <p className={subtitle}>
        Enter your email and we&apos;ll send a link to choose a new password.
        In development the link is printed in the server console.
      </p>

      {sent ? (
        <div className={success} role="status">
          If an account exists for that email, a reset link has been sent.
        </div>
      ) : (
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

          <button className={submit} type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className={footer}>
        <Link className={link} href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
