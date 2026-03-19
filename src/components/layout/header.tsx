"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function Header({ userName }: { userName?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-600 lg:hidden">LaunchPad</h1>
        <div className="flex items-center gap-4 ml-auto">
          {userName && (
            <span className="text-sm text-gray-600 hidden sm:block">
              {userName}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
