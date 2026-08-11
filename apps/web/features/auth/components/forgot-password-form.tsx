"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

const card =
  "w-full max-w-[400px] rounded-xl border border-foreground/12 bg-[color-mix(in_srgb,var(--background)_92%,var(--foreground)_4%)] p-8 shadow-sm";
const brand =
  "mb-2 text-[0.8rem] font-semibold tracking-[0.06em] text-foreground/55 uppercase";
const title = "mb-1.5 text-2xl font-semibold tracking-tight";
const subtitle = "mb-6 text-[0.9rem] leading-snug text-foreground/65";
const form = "flex flex-col gap-4";
const field = "flex flex-col gap-1.5";
const label = "text-[0.85rem] font-medium";
const input =
  "w-full appearance-none rounded-lg border border-foreground/18 bg-background px-3 py-2.5 text-[0.95rem] text-foreground transition-[border-color,box-shadow] duration-150 focus:border-foreground/45 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--foreground)_8%,transparent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
const submit =
  "mt-1 cursor-pointer rounded-lg border-none bg-foreground px-4 py-2.5 text-[0.95rem] font-semibold text-background transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55";
const error =
  "rounded-lg border border-[#c43c3c]/25 bg-[#c43c3c]/10 px-3 py-2.5 text-sm leading-snug text-[#c43c3c] dark:text-[#f07178]";
const success =
  "rounded-lg border border-[#2a7a4b]/25 bg-[#2a7a4b]/10 px-3 py-2.5 text-sm leading-snug text-[#2a7a4b] dark:text-[#7dcea0]";
const footer = "mt-5 text-center text-sm text-foreground/65";
const link = "font-medium text-foreground underline underline-offset-2 hover:opacity-80";

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
      <p className={brand}>Aiditr</p>
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
