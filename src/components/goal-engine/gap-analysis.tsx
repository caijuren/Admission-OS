"use client";

import { Metric } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";

interface GapAnalysisProps {
  metrics: Metric[];
  title?: string;
}

const categoryColors: Record<string, string> = {
  "数学": "text-blue-400",
  "物理": "text-purple-400",
  "英语": "text-green-400",
  "阅读": "text-yellow-400",
  "学习能力": "text-orange-400",
  "项目": "text-pink-400"
};

const categoryBgColors: Record<string, string> = {
  "数学": "bg-blue-500/10 border-blue-500/20",
  "物理": "bg-purple-500/10 border-purple-500/20",
  "英语": "bg-green-500/10 border-green-500/20",
  "阅读": "bg-yellow-500/10 border-yellow-500/20",
  "学习能力": "bg-orange-500/10 border-orange-500/20",
  "项目": "bg-pink-500/10 border-pink-500/20"
};

export function GapAnalysis({ metrics, title = "智能差距分析" }: GapAnalysisProps) {
  const overallProgress = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.currentValue / m.targetValue) * 100, 0) / metrics.length)
    : 0;

  const greenCount = metrics.filter(m => m.status === "green").length;
  const yellowCount = metrics.filter(m => m.status === "yellow").length;
  const redCount = metrics.filter(m => m.status === "red").length;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-glow" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> {greenCount}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" /> {yellowCount}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" /> {redCount}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* 总体进度 */}
        <div className={cn(
          "p-4 rounded-xl border",
          overallProgress >= 80 ? "bg-green-500/5 border-green-500/20" :
          overallProgress >= 60 ? "bg-yellow-500/5 border-yellow-500/20" :
          "bg-red-500/5 border-red-500/20"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">总体完成度</span>
            <span className={cn(
              "text-2xl font-bold",
              overallProgress >= 80 ? "text-green-400" :
              overallProgress >= 60 ? "text-yellow-400" :
              "text-red-400"
            )}>
              {overallProgress}%
            </span>
          </div>
          <Progress
            value={overallProgress}
            className={cn(
              "h-3",
              overallProgress >= 80 ? "[&>div]:bg-green-500" :
              overallProgress >= 60 ? "[&>div]:bg-yellow-500" :
              "[&>div]:bg-red-500"
            )}
          />
        </div>

        {/* 各项指标差距 */}
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <div
              key={metric.id}
              className={cn(
                "p-4 rounded-xl border transition-all animate-fade-in",
                categoryBgColors[metric.category] || "bg-muted border-muted",
                metric.status === "green" && "border-green-500/30",
                metric.status === "yellow" && "border-yellow-500/30",
                metric.status === "red" && "border-red-500/30"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("font-semibold", categoryColors[metric.category])}>
                    {metric.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {metric.category}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {metric.gap > 15 ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : metric.gap > 5 ? (
                    <Minus className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>当前 {metric.currentValue}{metric.unit}</span>
                    <span>目标 {metric.targetValue}{metric.unit}</span>
                  </div>
                  <Progress
                    value={(metric.currentValue / metric.targetValue) * 100}
                    className={cn(
                      "h-2",
                      metric.status === "green" && "[&>div]:bg-green-500",
                      metric.status === "yellow" && "[&>div]:bg-yellow-500",
                      metric.status === "red" && "[&>div]:bg-red-500"
                    )}
                  />
                </div>
                <span className={cn(
                  "text-sm font-bold w-12 text-right",
                  metric.status === "green" ? "text-green-400" :
                  metric.status === "yellow" ? "text-yellow-400" :
                  "text-red-400"
                )}>
                  {Math.round((metric.currentValue / metric.targetValue) * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  metric.status === "green" && "bg-green-500/20 text-green-400",
                  metric.status === "yellow" && "bg-yellow-500/20 text-yellow-400",
                  metric.status === "red" && "bg-red-500/20 text-red-400"
                )}>
                  {metric.status === "green" ? "达标" : metric.status === "yellow" ? "接近" : "落后"}
                  {metric.gap}{metric.unit}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {metric.status === "red" ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : metric.status === "green" ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : null}
                  {metric.suggestion}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
