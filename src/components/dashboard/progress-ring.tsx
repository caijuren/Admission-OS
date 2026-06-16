"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  color?: "emerald" | "blue" | "purple" | "amber";
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
  color = "emerald",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colors = {
    emerald: { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.3)" },
    blue: { stroke: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)" },
    purple: { stroke: "#8b5cf6", glow: "rgba(139, 92, 246, 0.3)" },
    amber: { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)" },
  };

  const c = colors[color];

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 8px ${c.glow})` }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={c.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: c.stroke }}>
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
}
