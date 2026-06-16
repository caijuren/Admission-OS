"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  Flag,
  LogOut,
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
  { href: "/goals", label: "目标计划", icon: Flag },
  { href: "/grades", label: "校内成绩", icon: BarChart3 },
  { href: "/reading", label: "阅读表达", icon: BookOpen },
  { href: "/records", label: "能力资产", icon: TreePine },
  { href: "/timeline", label: "成长档案", icon: Clock },
  { href: "/weekly", label: "阶段复盘", icon: CalendarDays },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<StudentProfile>({ ...DEFAULT_PROFILE, ...seedData.profile });

  useEffect(() => {
    if (pathname === "/login") return;
    getProductConfig().then((config) => setProfile(config.profile));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (pathname === "/login") {
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

        <Link href="/settings" className="sidebar-profile">
          <div className="sidebar-avatar">
            {profile.name ? profile.name.slice(0, 1) : <UserRound className="h-4 w-4" />}
          </div>
          <div>
            <strong>{profile.name}</strong>
            <span>点这里修改档案/头像</span>
          </div>
        </Link>

        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>退出</span>
        </button>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
