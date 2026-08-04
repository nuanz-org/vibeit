"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import styles from "../styles.module.css";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/create";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.status === 403) {
        setError("Please verify your email address before signing in.");
        return;
      }
      setError(signInError.message || "Could not sign in. Check your credentials.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className={styles.card}>
      <p className={styles.brand}>Vibeit</p>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>
        Use your email and password to continue to Create.
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={loading}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.rowBetween}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <Link className={styles.mutedLink} href="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={loading}
          />
        </div>

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className={styles.footer}>
        No account?{" "}
        <Link className={styles.link} href="/signup">
          Create one
        </Link>
      </p>
    </div>
  );
}