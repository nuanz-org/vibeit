"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function ProfileSignOut() {
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
      className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[12px] border border-border-subtle bg-transparent px-4 text-[0.9rem] font-medium tracking-[-0.01em] text-ink transition-[background-color,transform] duration-150 hover:bg-ink/5 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      Sign out
    </button>
  );
}
