"use client";

import { ActionItem, GrowthPrediction } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkles, Clock, AlertTriangle, CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";

interface ActionRecommendationsProps {
  actions: ActionItem[];
  prediction: GrowthPrediction;
  title?: string;
}

const priorityConfig = {
  high: {
    label: "高优先级",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: AlertTriangle
  },
  medium: {
    label: "中优先级",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: Clock
  },
  low: {
    label: "低优先级",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    icon: CheckCircle2
  }
};

const categoryColors: Record<string, string> = {
  "数学": "bg-blue-500/20 text-blue-400",
  "物理": "bg-purple-500/20 text-purple-400",
  "英语": "bg-green-500/20 text-green-400",
  "阅读": "bg-yellow-500/20 text-yellow-400",
  "学习能力": "bg-orange-500/20 text-orange-400"
};

export function ActionRecommendations({ actions, prediction, title = "行动建议" }: ActionRecommendationsProps) {
  const todayActions = actions.filter(a => a.priority === "high" || a.priority === "medium").slice(0, 3);
  const totalMinutes = todayActions.reduce((sum, a) => sum + a.estimatedMinutes, 0);

  return (
    <div className="space-y-4">
      {/* 今日重点 */}
      <Card className="card-hover">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              今日重点
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              约 {totalMinutes} 分钟
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {todayActions.map((action, index) => {
            const config = priorityConfig[action.priority];
            const PriorityIcon = config.icon;

            return (
              <div
                key={action.id}
                className={cn(
                  "p-4 rounded-xl border transition-all animate-fade-in cursor-pointer",
                  config.bg,
                  "hover:scale-[1.01] hover:shadow-lg"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl",
                    config.bg
                  )}>
                    <PriorityIcon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{action.title}</h4>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        categoryColors[action.category]
                      )}>
                        {action.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {action.estimatedMinutes}分钟
                      </span>
                      <span className={cn(
                        "flex items-center gap-1",
                        action.priority === "high" && "text-red-400",
                        action.priority === "medium" && "text-yellow-400"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full",
                          action.priority === "high" ? "bg-red-400" : "bg-yellow-400"
                        )} />
                        {config.label}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 成长预测 */}
      <Card className="card-hover">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            成长预测
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* 轨道状态 */}
          <div className={cn(
            "p-4 rounded-xl border flex items-center gap-4",
            prediction.onTrack
              ? "bg-green-500/10 border-green-500/20"
              : "bg-yellow-500/10 border-yellow-500/20"
          )}>
            <div className={cn(
              "flex items-center justify-center w-14 h-14 rounded-xl",
              prediction.onTrack ? "bg-green-500/20" : "bg-yellow-500/20"
            )}>
              {prediction.onTrack ? (
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                "text-lg font-bold",
                prediction.onTrack ? "text-green-400" : "text-yellow-400"
              )}>
                {prediction.onTrack ? "轨道正常" : "需要注意"}
              </p>
              <p className="text-sm text-muted-foreground">
                当前完成度 {prediction.completionRate}%
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-3xl font-bold",
                prediction.onTrack ? "text-green-400" : "text-yellow-400"
              )}>
                {prediction.completionRate}%
              </span>
            </div>
          </div>

          {/* 风险因素 */}
          {prediction.riskFactors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">风险因素</h4>
              <div className="space-y-2">
                {prediction.riskFactors.map((risk, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 建议 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">建议</h4>
            <div className="space-y-2">
              {prediction.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
