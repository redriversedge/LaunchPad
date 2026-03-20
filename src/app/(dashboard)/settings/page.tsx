"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Settings</h1>

      <div className="card p-6">
        <h2 className="font-semibold mb-4 dark:text-white">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="dark:text-gray-200">{session?.user?.email || "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Name</span>
            <span className="dark:text-gray-200">{session?.user?.name || "Not set"}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4 dark:text-white">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium dark:text-gray-200">Dark Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {theme === "dark" ? "Dark theme is active" : "Light theme is active"}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-brand-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4 dark:text-white">Danger Zone</h2>
        <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-700 font-medium">
          Sign out of LaunchPad
        </button>
      </div>
    </div>
  );
}
