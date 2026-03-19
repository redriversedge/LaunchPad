import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchPad - Your AI Career Agent",
  description: "Find, apply to, and prepare for jobs with AI-powered assistance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
