"use client";

import { FormEvent, useEffect, useState } from "react";
import { Archive, Bot, Database, FileText, KeyRound, Route, Save, ShieldCheck, Target, User } from "lucide-react";
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
  configured?: boolean;
  webhookUrl?: string;
};

type AiSettingsData = {
  configured?: boolean;
  provider?: "openai" | "deepseek" | "custom";
  baseUrl?: string;
  model?: string;
  maskedApiKey?: string;
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
  const [dingtalkMaskedUrl, setDingtalkMaskedUrl] = useState("");
  const [dingtalkConfigured, setDingtalkConfigured] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiSettingsData["provider"]>("openai");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiMaskedApiKey, setAiMaskedApiKey] = useState("");
  const [aiConfigured, setAiConfigured] = useState(false);
  const [saveError, setSaveError] = useState("");
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
    fetch("/api/integrations/dingtalk", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: SettingsData | null) => {
        setDingtalkConfigured(Boolean(data?.configured));
        setDingtalkMaskedUrl(data?.webhookUrl || "");
      })
      .catch(() => undefined);
    fetch("/api/integrations/ai", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: AiSettingsData | null) => {
        setAiConfigured(Boolean(data?.configured));
        setAiProvider(data?.provider || "openai");
        setAiBaseUrl(data?.baseUrl || "");
        setAiModel(data?.model || "");
        setAiMaskedApiKey(data?.maskedApiKey || "");
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

    const profileResponse = await fetch("/api/data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: nextProfile,
        pathwayStages: nextPathwayStages,
      }),
    });

    if (!profileResponse.ok) {
      setSaveError("基础设置保存失败，请稍后重试。");
      return;
    }

    const nextWebhookUrl = String(form.get("dingtalkWebhookUrl") || "").trim();
    if (nextWebhookUrl || dingtalkConfigured) {
      const integrationResponse = await fetch("/api/integrations/dingtalk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: nextWebhookUrl }),
      });

      const integrationData = await integrationResponse.json().catch(() => null) as SettingsData & { error?: string } | null;
      if (!integrationResponse.ok) {
        setSaveError(integrationData?.error || "钉钉配置保存失败，请检查 Webhook。");
        return;
      }

      setDingtalkConfigured(Boolean(integrationData?.configured));
      setDingtalkMaskedUrl(integrationData?.webhookUrl || "");
    }

    const nextAiPayload = {
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      baseUrl: aiBaseUrl.trim(),
      model: aiModel.trim(),
    };
    if (nextAiPayload.apiKey || aiConfigured || nextAiPayload.baseUrl || nextAiPayload.model || nextAiPayload.provider !== "openai") {
      const aiResponse = await fetch("/api/integrations/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextAiPayload),
      });
      const aiData = await aiResponse.json().catch(() => null) as AiSettingsData & { error?: string } | null;
      if (!aiResponse.ok) {
        setSaveError(aiData?.error || "AI 配置保存失败，请检查服务地址和 Key。");
        return;
      }

      setAiConfigured(Boolean(aiData?.configured));
      setAiProvider(aiData?.provider || "openai");
      setAiBaseUrl(aiData?.baseUrl || "");
      setAiModel(aiData?.model || "");
      setAiMaskedApiKey(aiData?.maskedApiKey || "");
      setAiApiKey("");
    }

    setProfile(nextProfile);
    setPathwayStages(nextPathwayStages);
    setDingtalkWebhookUrl("");
    setSaveError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="design-page-shell settings-center">
      <section className="page-toolbar">
        <div>
          <h1>设置中心</h1>
          <span>{profile.name} · {profile.targetSchool} · {systemStatus.dataDriver} 模式</span>
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
              <nav className="settings-anchor-nav" aria-label="设置分区">
                <a href="#account">账户与登录</a>
                <a href="#profile">孩子档案</a>
                <a href="#integrations">钉钉推送</a>
                <a href="#ai">AI 顾问</a>
                <a href="#route">首页路线</a>
                <a href="#system">数据备份</a>
              </nav>
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
                  <span>{systemStatus.dataFile}</span>
                </div>
              </div>
              <div className="settings-info-row">
                <Archive className="h-4 w-4 text-[#FFB347]" />
                <div>
                  <strong>备份建议</strong>
                  <span>发布前备份 app_state 或 data/eduos.local.json</span>
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
                <span>机器人 Webhook{dingtalkConfigured ? ` · 已配置 ${dingtalkMaskedUrl}` : ""}</span>
                <Input
                  name="dingtalkWebhookUrl"
                  value={dingtalkWebhookUrl}
                  onChange={(event) => setDingtalkWebhookUrl(event.target.value)}
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                />
              </label>
              <div className="settings-hint-box">
                <strong>{dingtalkConfigured ? "钉钉推送已启用" : "钉钉推送未启用"}</strong>
                <span>为保护 access_token，保存后这里只显示脱敏地址。留空保存可清除当前 Webhook。</span>
              </div>
            </div>
          </section>

          <section id="ai" className="data-panel">
            <div className="data-panel-inner grid gap-4">
              <div className="settings-section-title">
                <Bot className="w-4 h-4 text-[#23B87A]" />
                <div>
                  <h2>AI 顾问</h2>
                  <p>配置 OpenAI-compatible 服务后，AI 顾问台会结合目标、任务和记录做计划建议。</p>
                </div>
              </div>
              <div className="settings-field-grid">
                <label>
                  <span>服务商</span>
                  <select value={aiProvider} onChange={(event) => setAiProvider(event.target.value as AiSettingsData["provider"])}>
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="custom">自定义兼容服务</option>
                  </select>
                </label>
                <label>
                  <span>模型</span>
                  <Input value={aiModel} onChange={(event) => setAiModel(event.target.value)} placeholder={aiProvider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini"} />
                </label>
                <label>
                  <span>Base URL</span>
                  <Input value={aiBaseUrl} onChange={(event) => setAiBaseUrl(event.target.value)} placeholder={aiProvider === "deepseek" ? "https://api.deepseek.com" : "https://api.openai.com/v1"} />
                </label>
                <label>
                  <span>API Key{aiConfigured ? ` · 已配置 ${aiMaskedApiKey}` : ""}</span>
                  <Input value={aiApiKey} onChange={(event) => setAiApiKey(event.target.value)} placeholder="sk-..." />
                </label>
              </div>
              <div className="settings-hint-box">
                <strong>{aiConfigured ? "AI 顾问已启用" : "未配置真实 AI Key"}</strong>
                <span>API Key 留空保存会保留当前密钥；未配置时，顾问台会使用本地规则给出基础建议。</span>
              </div>
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
                  <p>结构化模式会读写 Supabase 业务表，并保留 app_state JSON 快照作为迁移备份。</p>
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
            {saveError && <p className="text-sm text-[#EF4444]">{saveError}</p>}
            {saved && <p className="text-sm text-[#23B87A]">已保存到服务器本地文件</p>}
          </div>
        </main>
      </form>
    </div>
  );
}
