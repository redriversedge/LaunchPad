"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

export function Header({ userName }: { userName?: string }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-600 lg:hidden">LaunchPad</h1>
        <div className="flex items-center gap-4 ml-auto">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {userName && (
            <span className="text-sm text-gray-600 hidden sm:block dark:text-gray-400">
              {userName}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:text-gray-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
