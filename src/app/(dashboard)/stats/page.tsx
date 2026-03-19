"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface StatsData {
  total: number;
  byStatus: Record<string, number>;
  responseRate: number;
  interviewRate: number;
  appliedCount: number;
  responseCount: number;
  interviewCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  saved: { label: "Saved", color: "bg-gray-500", bg: "bg-gray-50" },
  applied: { label: "Applied", color: "bg-blue-500", bg: "bg-blue-50" },
  interviewing: { label: "Interviewing", color: "bg-amber-500", bg: "bg-amber-50" },
  offer: { label: "Offer", color: "bg-green-500", bg: "bg-green-50" },
  rejected: { label: "Rejected", color: "bg-red-500", bg: "bg-red-50" },
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load stats");
        return;
      }
      setStats(data);
    } catch {
      setError("Something went wrong loading stats.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Stats</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Stats</h1>
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No stats yet</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
            Once you start applying to jobs, you will see response rates, interview rates, and more here.
          </p>
          <Link href="/jobs" className="btn-primary">
            Search Jobs
          </Link>
        </div>
      </div>
    );
  }

  const maxStatusCount = Math.max(...Object.values(stats.byStatus), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>

      {/* Top-level numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Applications</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.appliedCount}</p>
          <p className="text-sm text-gray-500">Applied</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-brand-600">{stats.responseRate}%</p>
          <p className="text-sm text-gray-500">Response Rate</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-brand-600">{stats.interviewRate}%</p>
          <p className="text-sm text-gray-500">Interview Rate</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h2>
        <div className="space-y-3">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const meta = STATUS_LABELS[status] || { label: status, color: "bg-gray-500", bg: "bg-gray-50" };
            const percentage = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{meta.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${meta.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rate details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Response Rate</h2>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900">{stats.responseRate}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.responseCount} of {stats.appliedCount} applications received a response
          </p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${stats.responseRate}%` }}
            />
          </div>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Interview Rate</h2>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900">{stats.interviewRate}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.interviewCount} of {stats.appliedCount} applications reached interview stage
          </p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${stats.interviewRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
