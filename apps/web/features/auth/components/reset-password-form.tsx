"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import styles from "../styles.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "INVALID_TOKEN" || urlError === "invalid_token"
      ? "This reset link is invalid or has expired."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token. Request a new password reset link.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "Could not reset password.");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  if (!token && !urlError) {
    return (
      <div className={styles.card}>
        <p className={styles.brand}>Vibeit</p>
        <h1 className={styles.title}>Invalid link</h1>
        <p className={styles.subtitle}>
          This password reset page needs a valid token from your email link.
        </p>
        <p className={styles.footer}>
          <Link className={styles.link} href="/forgot-password">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.brand}>Vibeit</p>
      <h1 className={styles.title}>Choose a new password</h1>
      <p className={styles.subtitle}>
        Use at least 8 characters. Other sessions will be signed out after reset.
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            New password
          </label>
          <input
            id="password"
            className={styles.input}
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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            className={styles.input}
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
          className={styles.submit}
          type="submit"
          disabled={loading || !token}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className={styles.footer}>
        <Link className={styles.link} href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}