"use client";

import { cn } from "@/lib/utils/cn";

interface ProfileStrengthMeterProps {
  score: number;
  size?: "sm" | "lg";
}

export function ProfileStrengthMeter({ score, size = "lg" }: ProfileStrengthMeterProps) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-400";
  const bgColor = score >= 70 ? "text-green-100" : score >= 40 ? "text-yellow-100" : "text-red-100";
  const label = score >= 70 ? "Strong" : score >= 40 ? "Getting there" : "Needs work";

  const dimensions = size === "lg" ? "w-32 h-32" : "w-20 h-20";
  const textSize = size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", dimensions)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            strokeWidth="8"
            className={bgColor}
            stroke="currentColor"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn(color, "transition-all duration-1000 ease-out")}
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", textSize)}>{score}</span>
        </div>
      </div>
      {size === "lg" && (
        <span className={cn("text-sm font-medium", color)}>{label}</span>
      )}
    </div>
  );
}
