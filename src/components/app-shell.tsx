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
  Settings,
  Sparkles,
  TreePine,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PROFILE, getProductConfig, type StudentProfile } from "@/lib/product-data";
import seedData from "../../data/eduos.json";

const navItems = [
  { href: "/", label: "驾驶舱", icon: Compass },
  { href: "/goals", label: "目标地图", icon: Flag },
  { href: "/weekly", label: "周计划", icon: CalendarDays },
  { href: "/grades", label: "校内成绩", icon: BarChart3 },
  { href: "/reading", label: "阅读表达", icon: BookOpen },
  { href: "/records", label: "能力资产", icon: TreePine },
  { href: "/timeline", label: "成长档案", icon: Clock },
  { href: "/advisor", label: "AI 顾问", icon: MessageCircle },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<StudentProfile>({ ...DEFAULT_PROFILE, ...seedData.profile });

  const publicShell = pathname === "/login" || pathname === "/privacy";

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
    <div className="app-frame">
      <aside className="design-sidebar">
        <Link href="/" className="brand-block">
          <span>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <strong>Admission OS</strong>
          </div>
        </Link>

        <nav className="design-nav">
          {navItems.map((item) => {
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
        </nav>

        <form onSubmit={handleLogout} className="sidebar-profile">
          <div className="sidebar-avatar">
            {profile.name ? profile.name.slice(0, 1) : <UserRound className="h-4 w-4" />}
          </div>
          <div>
            <strong>{profile.name}</strong>
            <span>退出登录</span>
          </div>
          <button type="submit" aria-label="退出登录" />
        </form>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
