"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { ArrowLeft } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

import {
  AuthCard,
  Field,
  FormError,
  backLinkCls,
  footerCls,
  formCls,
  inputCls,
  submitCls,
} from "./auth-ui";

const MISMATCH = "Passwords don’t match.";

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
      setErrorMsg(MISMATCH);
      return;
    }

    setLoading(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (resetError) {
      setErrorMsg(resetError.message || "Couldn’t reset your password.");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  if (!token && !urlError) {
    return (
      <AuthCard
        eyebrow="Password reset"
        title="Invalid link"
        lead="This password reset page needs a valid token from your email link."
      >
        <Link className="btn btn-primary mt-6 w-full" href="/forgot-password">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  const mismatch = errorMsg === MISMATCH;

  return (
    <>
      <AuthCard
        title="Choose a new password"
        lead="Use at least 8 characters. Other sessions will be signed out after reset."
      >
        <form className={formCls} onSubmit={onSubmit}>
          <Field id="password" label="New password">
            <input
              id="password"
              className={inputCls}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading || !token}
            />
          </Field>

          <Field id="confirm" label="Confirm password">
            <input
              id="confirm"
              className={inputCls}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              disabled={loading || !token}
              aria-invalid={mismatch ? true : undefined}
              aria-describedby={mismatch ? "reset-error" : undefined}
            />
          </Field>

          {errorMsg ? <FormError id="reset-error">{errorMsg}</FormError> : null}

          <button
            className={submitCls}
            type="submit"
            disabled={loading || !token}
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </AuthCard>

      <p className={footerCls}>
        <Link className={backLinkCls} href="/login">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </p>
    </>
  );
}
