import type { Metadata } from "next";

import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up · Aiditr",
};

export default function SignUpPage() {
  return <SignUpForm />;
}