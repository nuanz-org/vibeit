"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

import {
  AuthCard,
  Field,
  FormError,
  footerCls,
  footerLinkCls,
  formCls,
  inputCls,
  quietLinkCls,
  submitCls,
} from "./auth-ui";

const VERIFY_EMAIL = "Verify your email address before signing in.";

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
        setErrorMsg(VERIFY_EMAIL);
        return;
      }
      setErrorMsg(signInError.message || "Couldn’t sign in. Check your credentials.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  // Credential errors point at both fields; "verify your email" doesn't.
  const invalid = errorMsg != null && errorMsg !== VERIFY_EMAIL ? true : undefined;
  const describedBy = errorMsg ? "sign-in-error" : undefined;

  return (
    <>
      <AuthCard
        title="Sign in"
        lead="Use your email and password to continue to Create."
      >
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
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </Field>

          <Field
            id="password"
            label="Password"
            aside={
              <Link className={quietLinkCls} href="/forgot-password">
                Forgot password?
              </Link>
            }
          >
            <input
              id="password"
              className={inputCls}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </Field>

          {errorMsg ? <FormError id="sign-in-error">{errorMsg}</FormError> : null}

          <button className={submitCls} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </AuthCard>

      <p className={footerCls}>
        No account?{" "}
        <Link
          className={footerLinkCls}
          href={
            next && next !== "/create"
              ? `/signup?next=${encodeURIComponent(next)}`
              : "/signup"
          }
        >
          Create one
        </Link>
      </p>
    </>
  );
}
