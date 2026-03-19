import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userName={session.user.name || undefined} />
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
