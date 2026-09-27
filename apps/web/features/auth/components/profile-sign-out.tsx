"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function ProfileSignOut({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className={cn("btn btn-outline btn-sm", className)}
    >
      Sign out
    </button>
  );
}
