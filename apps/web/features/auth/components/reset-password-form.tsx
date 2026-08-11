"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

const card =
  "w-full max-w-[400px] rounded-[12px] border border-border bg-card p-8";
const title = "mb-1.5 text-2xl font-medium tracking-[-0.03em]";
const subtitle = "mb-6 text-[0.95rem] leading-snug text-ink/70";

function AuthBrand() {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span
        className="inline-block size-6 shrink-0 rounded-[2px] bg-primary"
        aria-hidden
      />
      <p className="m-0 text-[15px] font-medium tracking-[-0.02em]">Aiditr</p>
    </div>
  );
}
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

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    urlError === "INVALID_TOKEN" || urlError === "invalid_token"
      ? "This reset link is invalid or has expired."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Missing reset token. Request a new password reset link.");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (resetError) {
      setErrorMsg(resetError.message || "Could not reset password.");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  if (!token && !urlError) {
    return (
      <div className={card}>
        <AuthBrand />
        <h1 className={title}>Invalid link</h1>
        <p className={subtitle}>
          This password reset page needs a valid token from your email link.
        </p>
        <p className={footer}>
          <Link className={link} href="/forgot-password">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <AuthBrand />
      <h1 className={title}>Choose a new password</h1>
      <p className={subtitle}>
        Use at least 8 characters. Other sessions will be signed out after reset.
      </p>

      <form className={form} onSubmit={onSubmit}>
        {errorMsg ? (
          <div className={error} role="alert">
            {errorMsg}
          </div>
        ) : null}

        <div className={field}>
          <label className={label} htmlFor="password">
            New password
          </label>
          <input
            id="password"
            className={input}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={loading || !token}
          />
        </div>

        <div className={field}>
          <label className={label} htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            className={input}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            disabled={loading || !token}
          />
        </div>

        <button
          className={submit}
          type="submit"
          disabled={loading || !token}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className={footer}>
        <Link className={link} href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
