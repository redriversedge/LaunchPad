"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    headline: "",
    summary: "",
    currentLocation: "",
    yearsExperience: "",
    salaryMin: "",
    salaryMax: "",
    remotePreference: "",
    targetIndustry: "",
    willingToRelocate: false,
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setForm({
            headline: data.profile.headline || "",
            summary: data.profile.summary || "",
            currentLocation: data.profile.currentLocation || "",
            yearsExperience: data.profile.yearsExperience?.toString() || "",
            salaryMin: data.profile.salaryMin?.toString() || "",
            salaryMax: data.profile.salaryMax?.toString() || "",
            remotePreference: data.profile.remotePreference || "",
            targetIndustry: data.profile.targetIndustry || "",
            willingToRelocate: data.profile.willingToRelocate || false,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile.");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: form.headline || null,
          summary: form.summary || null,
          currentLocation: form.currentLocation || null,
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
          salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
          salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
          remotePreference: form.remotePreference || null,
          targetIndustry: form.targetIndustry || null,
          willingToRelocate: form.willingToRelocate,
        }),
      });

      if (!res.ok) {
        setError("Failed to save. Please try again.");
      } else {
        router.push("/profile");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <input
              type="text"
              className="input-field"
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              placeholder="e.g., Senior Financial Analyst | FP&A | Real Estate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              rows={3}
              className="input-field"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="A brief professional summary..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                className="input-field"
                value={form.currentLocation}
                onChange={(e) => setForm((f) => ({ ...f, currentLocation: e.target.value }))}
                placeholder="City, State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years Experience</label>
              <input
                type="number"
                className="input-field"
                value={form.yearsExperience}
                onChange={(e) => setForm((f) => ({ ...f, yearsExperience: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Job Preferences</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Industry</label>
            <input
              type="text"
              className="input-field"
              value={form.targetIndustry}
              onChange={(e) => setForm((f) => ({ ...f, targetIndustry: e.target.value }))}
              placeholder="e.g., Real Estate, Healthcare, Technology"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Style</label>
            <select
              className="input-field"
              value={form.remotePreference}
              onChange={(e) => setForm((f) => ({ ...f, remotePreference: e.target.value }))}
            >
              <option value="">Select preference</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
              <option value="any">Open to anything</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min ($)</label>
              <input
                type="number"
                className="input-field"
                value={form.salaryMin}
                onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                placeholder="e.g., 80000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max ($)</label>
              <input
                type="number"
                className="input-field"
                value={form.salaryMax}
                onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                placeholder="e.g., 120000"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.willingToRelocate}
              onChange={(e) => setForm((f) => ({ ...f, willingToRelocate: e.target.checked }))}
              className="rounded text-brand-600"
            />
            <span className="text-sm">Willing to relocate</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
