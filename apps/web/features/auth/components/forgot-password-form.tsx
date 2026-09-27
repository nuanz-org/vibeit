"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { ArrowLeft } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

import {
  AuthCard,
  Field,
  FormError,
  FormNotice,
  backLinkCls,
  footerCls,
  formCls,
  inputCls,
  submitCls,
} from "./auth-ui";

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
      setErrorMsg(resetError.message || "Couldn’t send the reset email.");
      return;
    }

    setSent(true);
  }

  return (
    <>
      <AuthCard
        title="Reset password"
        lead="Enter your email and we’ll send a link to choose a new password. In development the link is printed in the server console."
      >
        {sent ? (
          <FormNotice>
            If an account exists for that email, a reset link has been sent.
          </FormNotice>
        ) : (
          <form className={formCls} onSubmit={onSubmit}>
            <Field id="email" label="Email">
              <input
                id="email"
                className={inputCls}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={loading}
                aria-invalid={errorMsg ? true : undefined}
                aria-describedby={errorMsg ? "forgot-error" : undefined}
              />
            </Field>

            {errorMsg ? <FormError id="forgot-error">{errorMsg}</FormError> : null}

            <button className={submitCls} type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
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
