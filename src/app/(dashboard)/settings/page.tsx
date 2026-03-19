"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span>{session?.user?.email || "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span>{session?.user?.name || "Not set"}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Danger Zone</h2>
        <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-700 font-medium">
          Sign out of LaunchPad
        </button>
      </div>
    </div>
  );
}
