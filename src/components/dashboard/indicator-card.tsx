"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Indicator } from "@/types";

interface IndicatorCardProps {
  indicator: Indicator;
}

export function IndicatorCard({ indicator }: IndicatorCardProps) {
  const progress = Math.round((indicator.current / indicator.target) * 100);

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  }[indicator.trend];

  const statusStyles = {
    green: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-600",
      dot: "bg-emerald-500",
      progress: "stroke-emerald-500",
    },
    yellow: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-600",
      dot: "bg-amber-500",
      progress: "stroke-amber-500",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-100",
      text: "text-red-600",
      dot: "bg-red-500",
      progress: "stroke-red-500",
    },
  };

  const style = statusStyles[indicator.status];

  return (
    <div
      className={cn(
        "indicator-card group cursor-pointer",
        style.bg,
        style.border
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", style.dot)} />
          <span className="text-[13px] font-medium text-foreground">
            {indicator.name}
          </span>
        </div>
        <TrendIcon
          className={cn(
            "w-4 h-4 transition-transform group-hover:scale-110",
            indicator.trend === "up" && "text-emerald-500",
            indicator.trend === "down" && "text-red-500",
            indicator.trend === "stable" && "text-muted-foreground"
          )}
        />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-semibold tracking-tight text-foreground">
              {indicator.current}
            </span>
            <span className="text-[13px] text-muted-foreground">
              / {indicator.target}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={cn("text-[11px]", style.text)}>
              {indicator.trend === "up" && "↑ 上升中"}
              {indicator.trend === "down" && "↓ 下降中"}
              {indicator.trend === "stable" && "→ 稳定"}
            </span>
          </div>
        </div>

        <div className="relative w-12 h-12">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-black/5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={cn("progress-ring", style.progress)}
              style={{
                strokeDasharray: 97.5,
                strokeDashoffset: 97.5 - (97.5 * progress) / 100,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-[11px] font-semibold", style.text)}>
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
