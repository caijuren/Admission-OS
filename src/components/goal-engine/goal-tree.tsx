"use client";

import { useState } from "react";
import { GoalNode } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalTreeProps {
  goals: GoalNode[];
  onSelectGoal?: (goal: GoalNode) => void;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
  in_progress: { icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10" },
  pending: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted" },
  at_risk: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" }
};

const typeConfig = {
  school: { label: "目标学校", color: "text-purple-400" },
  year: { label: "年度目标", color: "text-blue-400" },
  term: { label: "学期目标", color: "text-green-400" },
  month: { label: "月度目标", color: "text-yellow-400" },
  week: { label: "周目标", color: "text-orange-400" }
};

export function GoalTree({ goals, onSelectGoal }: GoalTreeProps) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow" />
            目标路线图
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" /> 已完成
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" /> 进行中
            </span>
            <span className="flex items-center gap-1">
              <Circle className="w-3 h-3" /> 待开始
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {goals.map((goal, index) => (
            <GoalTreeNode
              key={goal.id}
              goal={goal}
              level={0}
              isLast={index === goals.length - 1}
              onSelect={onSelectGoal}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface GoalTreeNodeProps {
  goal: GoalNode;
  level: number;
  isLast: boolean;
  onSelect?: (goal: GoalNode) => void;
}

function GoalTreeNode({ goal, level, isLast, onSelect }: GoalTreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = goal.children && goal.children.length > 0;
  const status = statusConfig[goal.status];
  const TypeIcon = status.icon;

  return (
    <div className="animate-fade-in" style={{ animationDelay: `${level * 0.1}s` }}>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer",
          "hover:bg-secondary/50",
          level === 0 && "bg-gradient-to-r from-primary/5 to-transparent border border-primary/10"
        )}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => onSelect?.(goal)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", status.bg)}>
          <TypeIcon className={cn("w-4 h-4", status.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", typeConfig[goal.type]?.color)}>
              {typeConfig[goal.type]?.label}
            </span>
            <span className="text-sm font-semibold truncate">{goal.title}</span>
          </div>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{goal.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {goal.metrics && goal.metrics.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {goal.metrics.slice(0, 3).map((metric) => (
                <span
                  key={metric.id}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    metric.status === "green" && "bg-green-500/20 text-green-400",
                    metric.status === "yellow" && "bg-yellow-500/20 text-yellow-400",
                    metric.status === "red" && "bg-red-500/20 text-red-400"
                  )}
                >
                  {metric.category} {metric.currentValue}%
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 w-24">
            <Progress
              value={goal.progress}
              className="h-2 flex-1"
            />
            <span className="text-xs font-medium w-8 text-right">{goal.progress}%</span>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="relative">
          <div
            className="absolute left-6 top-0 bottom-0 w-px bg-border/50"
            style={{ marginLeft: `${(level + 1) * 24 - 12}px` }}
          />
          {goal.children!.map((child, index) => (
            <GoalTreeNode
              key={child.id}
              goal={child}
              level={level + 1}
              isLast={index === goal.children!.length - 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
