"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, FileText, Save, Settings, Target, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MILESTONES,
  DEFAULT_PROFILE,
  getProductConfig,
  type JourneyMilestone,
  type StudentProfile,
} from "@/lib/product-data";
import seedData from "../../../data/eduos.json";

export default function SettingsPage() {
  const [profile, setProfile] = useState<StudentProfile>({ ...DEFAULT_PROFILE, ...seedData.profile });
  const [milestones, setMilestones] = useState<JourneyMilestone[]>(
    seedData.journey?.milestones?.length ? seedData.journey.milestones as JourneyMilestone[] : DEFAULT_MILESTONES
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProductConfig().then((config) => {
      setProfile(config.profile);
      setMilestones(config.journey.milestones);
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextProfile: StudentProfile = {
      ...profile,
      name: String(form.get("name") || ""),
      school: String(form.get("school") || ""),
      grade: String(form.get("grade") || ""),
      targetSchool: String(form.get("targetSchool") || ""),
      currentStage: String(form.get("currentStage") || ""),
      progress: Number(form.get("progress") || 0),
      quote: String(form.get("quote") || ""),
    };
    const nextMilestones = milestones.map((milestone, index) => ({
      ...milestone,
      title: String(form.get(`milestone-${index}-title`) || milestone.title),
      subtitle: String(form.get(`milestone-${index}-subtitle`) || milestone.subtitle),
    }));

    await fetch("/api/data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: nextProfile,
        journey: { milestones: nextMilestones },
      }),
    });

    setProfile(nextProfile);
    setMilestones(nextMilestones);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>设置</h1>
          <span>{profile.name} · {profile.targetSchool}</span>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="settings-layout">
        <aside className="settings-summary-stack">
          <section className="data-panel">
            <div className="data-panel-inner">
              <div className="settings-profile-card">
                <div className="settings-avatar">{profile.name.slice(0, 1) || "孩"}</div>
                <div>
                  <span>当前档案</span>
                  <h2>{profile.name}</h2>
                  <p>{profile.school} · {profile.grade}</p>
                </div>
              </div>
              <div className="settings-target-box">
                <Target className="h-4 w-4 text-[#5B6BF5]" />
                <div>
                  <strong>{profile.targetSchool}</strong>
                  <span>{profile.currentStage} · 准备度 {profile.progress}%</span>
                </div>
              </div>
              <div className="settings-hint-box">左下角头像和姓名来自这里；修改孩子姓名后，头像会自动取姓名首字。</div>
            </div>
          </section>

          <section className="data-panel">
            <div className="data-panel-inner">
              <div className="settings-info-row">
                <Database className="h-4 w-4 text-[#23B87A]" />
                <div>
                  <strong>数据存储</strong>
                  <span>基础配置写入 Supabase Postgres；阅读和成绩记录同步进入成长档案。</span>
                </div>
              </div>
              <div className="settings-info-row">
                <FileText className="h-4 w-4 text-[#FFB347]" />
                <div>
                  <strong>建议配置</strong>
                  <span>先把目标学校、当前阶段、阶段路径填准，再继续补证据。</span>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <main className="settings-form-stack">
          <section className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <User className="w-4 h-4 text-[#5B6BF5]" />
                <div>
                  <h2>孩子与升学目标档案</h2>
                  <p>这些信息会出现在驾驶舱、左下角头像和阶段复盘中；当前头像使用孩子姓名首字。</p>
                </div>
              </div>
              <div className="settings-field-grid">
                <label><span>孩子姓名</span><Input name="name" defaultValue={profile.name} placeholder="孩子姓名" /></label>
                <label><span>当前学校</span><Input name="school" defaultValue={profile.school} placeholder="学校" /></label>
                <label><span>当前年级</span><Input name="grade" defaultValue={profile.grade} placeholder="年级" /></label>
                <label><span>目标学校</span><Input name="targetSchool" defaultValue={profile.targetSchool} placeholder="目标学校" /></label>
                <label><span>当前阶段</span><Input name="currentStage" defaultValue={profile.currentStage} placeholder="当前阶段" /></label>
                <label><span>总准备度</span><Input name="progress" type="number" min="0" max="100" defaultValue={profile.progress} placeholder="进度" /></label>
              </div>
              <label className="settings-wide-field">
                <span>升学目标寄语</span>
                <Input name="quote" defaultValue={profile.quote} placeholder="升学目标寄语" />
              </label>
            </div>
          </section>

          <section className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <Settings className="w-4 h-4 text-[#5B6BF5]" />
                <div>
                  <h2>交附嘉分阶段路径</h2>
                  <p>控制驾驶舱顶部路径和整体节奏。</p>
                </div>
              </div>
              <div className="settings-milestone-list">
                {milestones.map((milestone, index) => (
                  <div key={index} className="settings-milestone-row">
                    <span>{index + 1}</span>
                    <Input name={`milestone-${index}-title`} defaultValue={milestone.title} placeholder="阶段名称" />
                    <Input name={`milestone-${index}-subtitle`} defaultValue={milestone.subtitle} placeholder="阶段说明" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="settings-submit-row">
            <Button type="submit" className="bg-[#5B6BF5] hover:bg-[#4F5DE0] rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
            {saved && <p className="text-sm text-[#4CD7A4]">已保存到数据库</p>}
          </div>
        </main>
      </form>
    </div>
  );
}
