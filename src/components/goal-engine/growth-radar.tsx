"use client";

import { RadarData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GrowthRadarProps {
  data: RadarData[];
  title?: string;
}

export function GrowthRadar({ data, title = "成长雷达图" }: GrowthRadarProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const categories = ["数学", "物理", "英语", "阅读", "学习能力", "项目"];

  // 获取角度
  const getAngle = (index: number, total: number) => {
    return (index * 360) / total - 90;
  };

  // 转换为弧度
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // 计算点的位置
  const getPointPosition = (index: number, value: number, maxValue: number, radius: number) => {
    const angle = getAngle(index, data.length);
    const distance = (value / maxValue) * radius;
    return {
      x: 50 + distance * Math.cos(toRadians(angle)),
      y: 50 + distance * Math.sin(toRadians(angle))
    };
  };

  // 生成背景网格
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <Card className="card-hover">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-glow" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative w-full aspect-square max-w-[320px] mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* 背景网格 */}
            {gridLevels.map((level, i) => (
              <polygon
                key={i}
                points={data.map((_, idx) => {
                  const pos = getPointPosition(idx, level * 100, 100, 40);
                  return `${pos.x},${pos.y}`;
                }).join(" ")}
                fill="none"
                stroke="hsl(240 4% 18%)"
                strokeWidth="0.3"
              />
            ))}

            {/* 轴线 */}
            {data.map((_, index) => {
              const endPos = getPointPosition(index, 100, 100, 40);
              return (
                <line
                  key={index}
                  x1="50"
                  y1="50"
                  x2={endPos.x}
                  y2={endPos.y}
                  stroke="hsl(240 4% 18%)"
                  strokeWidth="0.3"
                />
              );
            })}

            {/* 数据区域 */}
            <polygon
              points={data.map((d, i) => {
                const pos = getPointPosition(i, d.value, 100, 40);
                return `${pos.x},${pos.y}`;
              }).join(" ")}
              fill="url(#radarGradient)"
              fillOpacity="0.3"
              stroke="hsl(263 84% 61%)"
              strokeWidth="0.8"
              className="animate-fade-in"
            />

            {/* 渐变定义 */}
            <defs>
              <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(263 84% 61%)" />
                <stop offset="100%" stopColor="hsl(263 84% 61%)" stopOpacity="0.1" />
              </radialGradient>
            </defs>

            {/* 数据点 */}
            {data.map((d, i) => {
              const pos = getPointPosition(i, d.value, 100, 40);
              return (
                <circle
                  key={i}
                  cx={pos.x}
                  cy={pos.y}
                  r="2"
                  fill="hsl(263 84% 61%)"
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              );
            })}
          </svg>

          {/* 标签 */}
          <div className="absolute inset-0">
            {data.map((d, i) => {
              const angle = getAngle(i, data.length);
              const labelRadius = 48;
              const x = 50 + labelRadius * Math.cos(toRadians(angle));
              const y = 50 + labelRadius * Math.sin(toRadians(angle));

              return (
                <div
                  key={i}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`
                  }}
                >
                  <span className="text-xs font-medium text-muted-foreground">{d.subject}</span>
                  <span
                    className={cn(
                      "block text-sm font-bold",
                      d.value >= 80 ? "text-green-400" : d.value >= 60 ? "text-yellow-400" : "text-red-400"
                    )}
                  >
                    {d.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 图例 */}
        <div className="flex justify-center gap-4 mt-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">优秀 (80+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">良好 (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">需加强 (&lt;60)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
