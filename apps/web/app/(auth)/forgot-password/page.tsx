import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password · Vibeit",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}