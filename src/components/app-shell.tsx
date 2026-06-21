"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  Flag,
  MessageCircle,
  LogOut,
  Settings,
  Sparkles,
  Target,
  TreePine,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PROFILE, getProductConfig, type StudentProfile } from "@/lib/product-data";
import seedData from "../../data/eduos.json";

const navItems = [
  {
    title: "总览",
    items: [{ href: "/", label: "驾驶舱", icon: Compass }],
  },
  {
    title: "规划执行",
    items: [
      { href: "/goals", label: "目标地图", icon: Flag },
      { href: "/weekly", label: "周计划", icon: CalendarDays },
      { href: "/advisor", label: "AI 顾问", icon: MessageCircle },
    ],
  },
  {
    title: "成长证据",
    items: [
      { href: "/grades", label: "校内成绩", icon: BarChart3 },
      { href: "/reading", label: "阅读表达", icon: BookOpen },
      { href: "/records", label: "能力资产", icon: TreePine },
      { href: "/timeline", label: "成长档案", icon: Clock },
    ],
  },
  {
    title: "系统",
    items: [{ href: "/settings", label: "设置", icon: Settings }],
  },
];

const flatNavItems = navItems.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));

function getSection(pathname: string) {
  if (pathname.startsWith("/grades") || pathname.startsWith("/reading") || pathname.startsWith("/records") || pathname.startsWith("/timeline") || pathname.startsWith("/portfolio")) {
    return "evidence";
  }
  if (pathname.startsWith("/advisor")) return "advisor";
  if (pathname.startsWith("/settings")) return "system";
  if (pathname.startsWith("/goals") || pathname.startsWith("/weekly")) return "planning";
  return "home";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<StudentProfile>({ ...DEFAULT_PROFILE, ...seedData.profile });

  const publicShell = pathname === "/login" || pathname === "/privacy";
  const showContextBar = pathname !== "/" && !pathname.startsWith("/weekly");
  const activeNavItem = flatNavItems
    .filter((item) => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  useEffect(() => {
    if (publicShell) return;

    let cancelled = false;

    async function loadProfile() {
      const config = await getProductConfig();
      if (cancelled) return;
      setProfile(config.profile);
    }

    loadProfile().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [publicShell]);

  async function handleLogout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (publicShell) {
    return <>{children}</>;
  }

  return (
    <div className="app-frame" data-section={getSection(pathname)}>
      <aside className="design-sidebar">
        <Link href="/" className="brand-block">
          <span>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <strong>Admission OS</strong>
            <em>升学规划工作台</em>
          </div>
        </Link>

        <nav className="design-nav">
          {navItems.map((group) => (
            <section key={group.title} className="design-nav-group">
              <strong>{group.title}</strong>
              <div>
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn("design-nav-item", active && "active")}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <form onSubmit={handleLogout} className="sidebar-profile">
          <div className="sidebar-avatar">
            {profile.name ? profile.name.slice(0, 1) : <UserRound className="h-4 w-4" />}
          </div>
          <div>
            <strong>{profile.name}</strong>
            <span>{profile.grade || "阶段待配置"} · {profile.targetSchool || "目标待配置"}</span>
          </div>
          <button type="submit" aria-label="退出登录" title="退出登录">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </aside>

      <main className="app-main">
        {showContextBar && (
          <div className="shell-context-bar">
            <div className="shell-context-current">
              <span>{activeNavItem?.group || "当前模块"}</span>
              <strong>{activeNavItem?.label || "Admission OS"}</strong>
            </div>
            <div>
              <span>当前学生</span>
              <strong>{profile.name || "未命名学生"}</strong>
            </div>
            <div>
              <span>目标学校</span>
              <strong>{profile.targetSchool || "待配置"}</strong>
            </div>
            <div>
              <span>所在阶段</span>
              <strong>{profile.grade || "待配置"} · {profile.school || "学校待配置"}</strong>
            </div>
            <Target className="h-4 w-4" />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
