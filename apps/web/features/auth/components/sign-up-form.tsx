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
  submitCls,
} from "./auth-ui";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/create";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error: signUpError } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signUpError) {
      setErrorMsg(signUpError.message || "Couldn’t create your account.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <>
      <AuthCard
        title="Create account"
        lead="Sign up with email and password to start creating tools."
      >
        <form className={formCls} onSubmit={onSubmit}>
          <Field id="name" label="Name">
            <input
              id="name"
              className={inputCls}
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              disabled={loading}
            />
          </Field>

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
            />
          </Field>

          <Field id="password" label="Password">
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
              disabled={loading}
            />
          </Field>

          {errorMsg ? <FormError>{errorMsg}</FormError> : null}

          <button className={submitCls} type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
      </AuthCard>

      <p className={footerCls}>
        Already have an account?{" "}
        <Link
          className={footerLinkCls}
          href={next && next !== "/create" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
