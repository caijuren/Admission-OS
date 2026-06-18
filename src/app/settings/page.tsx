"use client";

import { FormEvent, useEffect, useState } from "react";
import { Archive, Database, FileText, KeyRound, Route, Save, ShieldCheck, Target, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROFILE, getProductConfig, type PathwayStage, type PathwayTarget, type StudentProfile } from "@/lib/product-data";
import seedData from "../../../data/eduos.json";

const pathwayDimensions = ["数学", "英语", "语文", "项目竞赛", "校内成绩"];

type SystemStatus = {
  version: string;
  authMode: string;
  dataDriver: string;
  dataFile: string;
  cookieSecure: string;
};

type SettingsData = {
  integrations?: {
    dingtalkWebhookUrl?: string;
  };
};

function defaultTargetStatus(stageStatus: PathwayStage["status"]): PathwayTarget["status"] {
  if (stageStatus === "done") return "达标";
  if (stageStatus === "current") return "进行中";
  return "待配置";
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<StudentProfile>({ ...DEFAULT_PROFILE, ...seedData.profile });
  const [pathwayStages, setPathwayStages] = useState<PathwayStage[]>((seedData.pathwayStages || []) as PathwayStage[]);
  const [activePathwayId, setActivePathwayId] = useState(((seedData.pathwayStages || []) as PathwayStage[])[0]?.id || "");
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    version: "local",
    authMode: "local",
    dataDriver: "file",
    dataFile: "data/eduos.local.json",
    cookieSecure: "auto",
  });
  const [dingtalkWebhookUrl, setDingtalkWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProductConfig().then((config) => {
      const nextStages = config.pathwayStages?.length ? config.pathwayStages : (seedData.pathwayStages || []) as PathwayStage[];
      setProfile(config.profile);
      setPathwayStages(nextStages);
      setActivePathwayId((current) => {
        if (nextStages.some((stage) => stage.id === current)) return current;
        return nextStages.find((stage) => stage.status === "current")?.id || nextStages[0]?.id || "";
      });
    });
    fetch("/api/data", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: SettingsData | null) => {
        setDingtalkWebhookUrl(data?.integrations?.dingtalkWebhookUrl || "");
      })
      .catch(() => undefined);
    fetch("/api/system/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((status: SystemStatus | null) => {
        if (status) setSystemStatus(status);
      })
      .catch(() => undefined);
  }, []);

  const currentStage = pathwayStages.find((stage) => stage.status === "current") || pathwayStages[0];
  const activePathwayStage = pathwayStages.find((stage) => stage.id === activePathwayId) || pathwayStages[0];

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
    const nextPathwayStages = pathwayStages.map((stage) => {
      if (stage.id !== activePathwayStage?.id) return stage;

      const status = String(form.get("pathway-status") || stage.status) as PathwayStage["status"];
      const targets = pathwayDimensions.flatMap((dimension) => {
        const oldTargets = stage.targets.filter((target) => target.dimension === dimension);
        const lines = String(form.get(`pathway-${dimension}`) || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        return lines.map((goal, index) => ({
          dimension,
          goal,
          status: oldTargets[index]?.status || defaultTargetStatus(status),
          linkedGoalId: oldTargets[index]?.linkedGoalId,
        }));
      });

      return {
        ...stage,
        title: String(form.get("pathway-title") || stage.title),
        period: String(form.get("pathway-period") || stage.period),
        status,
        summary: String(form.get("pathway-summary") || stage.summary),
        targets,
      };
    });

    await fetch("/api/data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: nextProfile,
        pathwayStages: nextPathwayStages,
        integrations: {
          dingtalkWebhookUrl: String(form.get("dingtalkWebhookUrl") || ""),
        },
      }),
    });

    setProfile(nextProfile);
    setPathwayStages(nextPathwayStages);
    setDingtalkWebhookUrl(String(form.get("dingtalkWebhookUrl") || ""));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="design-page-shell settings-center">
      <section className="page-toolbar">
        <div>
          <h1>设置中心</h1>
          <span>{profile.name} · {profile.targetSchool} · 本地文件模式</span>
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
                <Target className="h-4 w-4 text-[#23B87A]" />
                <div>
                  <strong>{profile.targetSchool}</strong>
                  <span>{currentStage?.title || profile.currentStage} · 准备度 {profile.progress}%</span>
                </div>
              </div>
            </div>
          </section>

          <section className="data-panel">
            <div className="data-panel-inner settings-system-list">
              <div className="settings-info-row">
                <ShieldCheck className="h-4 w-4 text-[#23B87A]" />
                <div>
                  <strong>登录模式</strong>
                  <span>本地账号密码 · HttpOnly Cookie</span>
                </div>
              </div>
              <div className="settings-info-row">
                <Database className="h-4 w-4 text-[#2F7DD3]" />
                <div>
                  <strong>数据存储</strong>
                  <span>服务器文件：{systemStatus.dataFile}</span>
                </div>
              </div>
              <div className="settings-info-row">
                <Archive className="h-4 w-4 text-[#FFB347]" />
                <div>
                  <strong>备份建议</strong>
                  <span>发布前备份 data/eduos.local.json</span>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <main className="settings-form-stack">
          <section id="account" className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <KeyRound className="w-4 h-4 text-[#2F7DD3]" />
                <div>
                  <h2>账户与登录</h2>
                  <p>当前使用本地账号密码。用户名和密码在服务器 .env.production 中配置。</p>
                </div>
              </div>
              <div className="settings-account-grid">
                <div><span>认证方式</span><strong>{systemStatus.authMode}</strong></div>
                <div><span>Cookie</span><strong>HttpOnly</strong></div>
                <div><span>Secure Cookie</span><strong>{systemStatus.cookieSecure}</strong></div>
              </div>
            </div>
          </section>

          <section id="profile" className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <User className="w-4 h-4 text-[#23B87A]" />
                <div>
                  <h2>孩子与升学目标档案</h2>
                  <p>这些信息会出现在驾驶舱、左下角头像和阶段复盘中。</p>
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

          <section id="integrations" className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <FileText className="w-4 h-4 text-[#2F7DD3]" />
                <div>
                  <h2>钉钉推送</h2>
                  <p>填写钉钉自定义机器人 Webhook 后，周计划可推送今日安排、整体进度和周报。</p>
                </div>
              </div>
              <label className="settings-wide-field">
                <span>机器人 Webhook</span>
                <Input
                  name="dingtalkWebhookUrl"
                  defaultValue={dingtalkWebhookUrl}
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                />
              </label>
            </div>
          </section>

          <section id="route" className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <Route className="w-4 h-4 text-[#23B87A]" />
                <div>
                  <h2>首页登山路线卡片</h2>
                  <p>选择一个年级后编辑卡片内容，保存后同步到首页路线。</p>
                </div>
              </div>
              <div className="settings-route-picker">
                <label htmlFor="pathway-stage-select">正在编辑</label>
                <select
                  id="pathway-stage-select"
                  value={activePathwayStage?.id || ""}
                  onChange={(event) => setActivePathwayId(event.target.value)}
                >
                  {pathwayStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.title} · {stage.period}</option>
                  ))}
                </select>
              </div>
              {activePathwayStage && (
                <div key={activePathwayStage.id} className="settings-pathway-list">
                  <section className="settings-pathway-stage settings-pathway-stage-single">
                    <div className="settings-pathway-head">
                      <Input name="pathway-title" defaultValue={activePathwayStage.title} placeholder="阶段名称" />
                      <Input name="pathway-period" defaultValue={activePathwayStage.period} placeholder="时间范围" />
                      <select name="pathway-status" defaultValue={activePathwayStage.status}>
                        <option value="done">已完成</option>
                        <option value="current">当前阶段</option>
                        <option value="next">下一阶段</option>
                        <option value="future">远期规划</option>
                      </select>
                    </div>
                    <label className="settings-wide-field">
                      <span>卡片摘要</span>
                      <textarea name="pathway-summary" defaultValue={activePathwayStage.summary} />
                    </label>
                    <div className="settings-pathway-targets">
                      {pathwayDimensions.map((dimension) => (
                        <label key={dimension}>
                          <span>{dimension}</span>
                          <textarea
                            name={`pathway-${dimension}`}
                            defaultValue={activePathwayStage.targets.filter((target) => target.dimension === dimension).map((target) => target.goal).join("\n")}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </section>

          <section id="system" className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <FileText className="w-4 h-4 text-[#2F7DD3]" />
                <div>
                  <h2>数据与备份</h2>
                  <p>当前业务数据落在服务器本地文件。发布新版前建议先复制一份备份。</p>
                </div>
              </div>
              <div className="settings-backup-grid">
                <div><span>数据文件</span><strong>{systemStatus.dataFile}</strong></div>
                <div><span>种子文件</span><strong>data/eduos.json</strong></div>
                <div><span>当前版本</span><strong>v{systemStatus.version}</strong></div>
              </div>
            </div>
          </section>

          <div className="settings-submit-row">
            <Button type="submit" className="bg-[#23B87A] hover:bg-[#1FA36C] rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
            {saved && <p className="text-sm text-[#23B87A]">已保存到服务器本地文件</p>}
          </div>
        </main>
      </form>
    </div>
  );
}
