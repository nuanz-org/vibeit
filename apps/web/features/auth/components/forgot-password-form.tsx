"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import styles from "../styles.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "Could not send reset email.");
      return;
    }

    setSent(true);
  }

  return (
    <div className={styles.card}>
      <p className={styles.brand}>Aiditr</p>
      <h1 className={styles.title}>Reset password</h1>
      <p className={styles.subtitle}>
        Enter your email and we&apos;ll send a link to choose a new password.
        In development the link is printed in the server console.
      </p>

      {sent ? (
        <div className={styles.success} role="status">
          If an account exists for that email, a reset link has been sent.
        </div>
      ) : (
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

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className={styles.footer}>
        <Link className={styles.link} href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}