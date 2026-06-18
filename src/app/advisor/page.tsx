"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, Loader2, MessageSquarePlus, Pencil, RefreshCw, Save, Send, Settings2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

type MemoryType = "preference" | "student" | "goal" | "principle" | "decision";

type Memory = {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  enabled: boolean;
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
};

type MemoryForm = {
  type: MemoryType;
  title: string;
  content: string;
};

type MemorySuggestion = MemoryForm;

type TaskDraft = {
  title: string;
  category: string;
  description: string;
  target: number;
  unit: string;
  dailyTarget: string;
  priority: "高" | "中" | "低";
  executionMode: "孩子自主" | "家长陪练" | "亲子共学" | "家长验收";
  goalId?: string;
};

type ProgressDraft = {
  taskId: string;
  taskTitle: string;
  goalId: string;
  category: string;
  amount: number;
  unit: string;
  summary: string;
  note: string;
};

type DiagnosisItem = {
  id: string;
  severity: "info" | "warn" | "danger";
  title: string;
  evidence: string;
  suggestion: string;
};

type Diagnosis = {
  summary: string;
  items: DiagnosisItem[];
  generatedAt: string;
  provider: string;
};

type ActionLog = {
  id: string;
  type: "task_draft_apply" | "progress_apply" | "diagnosis_action_apply" | "memory_save";
  title: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

type ActionDraft =
  | {
      id?: string;
      type: "update_task";
      taskId: string;
      title: string;
      reason: string;
      patch: {
        priority?: "高" | "中" | "低";
        dailyTarget?: string;
        status?: "ahead" | "normal" | "behind";
        description?: string;
      };
    }
  | {
      id?: string;
      type: "create_task";
      title: string;
      reason: string;
      task: Omit<TaskDraft, "goalId"> & {
        goalId: string;
        goalIds?: string[];
        phaseId?: string;
      };
    };

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "我会结合目标地图、周计划和成长记录，帮你判断计划是否合理、执行是否偏离，以及下一步怎么调整。",
};

const memoryTypeLabels: Record<MemoryType, string> = {
  preference: "偏好",
  student: "节奏",
  goal: "目标",
  principle: "原则",
  decision: "决策",
};

const emptyMemoryForm: MemoryForm = {
  type: "preference",
  title: "",
  content: "",
};

const severityLabels: Record<DiagnosisItem["severity"], string> = {
  info: "观察",
  warn: "提醒",
  danger: "风险",
};

export default function AdvisorPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [memoryForm, setMemoryForm] = useState<MemoryForm>(emptyMemoryForm);
  const [editingMemoryId, setEditingMemoryId] = useState("");
  const [memorySuggestion, setMemorySuggestion] = useState<MemorySuggestion | null>(null);
  const [taskIdea, setTaskIdea] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [progressReport, setProgressReport] = useState("");
  const [progressDrafts, setProgressDrafts] = useState<ProgressDraft[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [savingSuggestion, setSavingSuggestion] = useState(false);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [applyingDrafts, setApplyingDrafts] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(false);
  const [applyingProgress, setApplyingProgress] = useState(false);
  const [generatingActions, setGeneratingActions] = useState("");
  const [applyingActions, setApplyingActions] = useState(false);
  const [error, setError] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      setLoadingHistory(true);
      const response = await fetch("/api/ai/conversations", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { conversations?: Conversation[]; error?: string } | null;
      if (cancelled) return;

      setLoadingHistory(false);
      if (!response.ok) {
        setError(data?.error || "AI 对话历史暂时不可用。");
        return;
      }

      const nextConversations = data?.conversations || [];
      setConversations(nextConversations);
      if (nextConversations[0]) {
        setActiveConversationId(nextConversations[0].id);
        setMessages(nextConversations[0].messages.length ? nextConversations[0].messages : [welcomeMessage]);
      }
    }

    loadConversations().catch(() => {
      if (!cancelled) {
        setLoadingHistory(false);
        setError("AI 对话历史暂时不可用。");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadActionLogs().catch(() => undefined);
  }, []);

  async function loadActionLogs() {
    const response = await fetch("/api/ai/action-logs", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { logs?: ActionLog[] } | null;
    if (response.ok) setActionLogs(data?.logs || []);
  }

  useEffect(() => {
    loadDiagnosis().catch(() => setError("计划诊断暂时不可用。"));
  }, []);

  async function loadDiagnosis() {
    setLoadingDiagnosis(true);
    setError("");
    const response = await fetch("/api/ai/plan-diagnosis", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { diagnosis?: Diagnosis; error?: string } | null;
    setLoadingDiagnosis(false);

    if (!response.ok) {
      setError(data?.error || "计划诊断暂时不可用。");
      return;
    }

    setDiagnosis(data?.diagnosis || null);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadMemories() {
      const response = await fetch("/api/ai/memories", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { memories?: Memory[]; error?: string } | null;
      if (cancelled) return;

      if (!response.ok) {
        setError(data?.error || "AI 记忆暂时不可用。");
        return;
      }

      setMemories(data?.memories || []);
    }

    loadMemories().catch(() => {
      if (!cancelled) setError("AI 记忆暂时不可用。");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function startNewConversation() {
    setActiveConversationId("");
    setMessages([welcomeMessage]);
    setInput("");
    setError("");
  }

  function selectConversation(conversation: Conversation) {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages.length ? conversation.messages : [welcomeMessage]);
    setInput("");
    setError("");
  }

  async function deleteConversation(conversationId: string) {
    const response = await fetch("/api/ai/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    const data = await response.json().catch(() => null) as { conversations?: Conversation[]; error?: string } | null;
    if (!response.ok) {
      setError(data?.error || "删除对话失败。");
      return;
    }

    const nextConversations = data?.conversations || [];
    setConversations(nextConversations);
    if (activeConversationId === conversationId) {
      const nextActive = nextConversations[0];
      setActiveConversationId(nextActive?.id || "");
      setMessages(nextActive?.messages.length ? nextActive.messages : [welcomeMessage]);
    }
  }

  function handleMemoryFormChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.currentTarget;
    setMemoryForm((current) => ({ ...current, [name]: value }));
  }

  function editMemory(memory: Memory) {
    setEditingMemoryId(memory.id);
    setMemoryForm({
      type: memory.type,
      title: memory.title,
      content: memory.content,
    });
  }

  function resetMemoryForm() {
    setEditingMemoryId("");
    setMemoryForm(emptyMemoryForm);
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memoryForm.title.trim() || !memoryForm.content.trim() || savingMemory) return;

    setSavingMemory(true);
    setError("");
    const response = await fetch("/api/ai/memories", {
      method: editingMemoryId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memoryId: editingMemoryId || undefined,
        ...memoryForm,
        sourceConversationId: activeConversationId || undefined,
      }),
    });
    const data = await response.json().catch(() => null) as { memories?: Memory[]; error?: string } | null;
    setSavingMemory(false);

    if (!response.ok) {
      setError(data?.error || "保存记忆失败。");
      return;
    }

    setMemories(data?.memories || []);
    resetMemoryForm();
    await loadActionLogs();
  }

  async function saveMemorySuggestion() {
    if (!memorySuggestion || savingSuggestion) return;

    setSavingSuggestion(true);
    setError("");
    const response = await fetch("/api/ai/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...memorySuggestion,
        sourceConversationId: activeConversationId || undefined,
      }),
    });
    const data = await response.json().catch(() => null) as { memories?: Memory[]; error?: string } | null;
    setSavingSuggestion(false);

    if (!response.ok) {
      setError(data?.error || "保存记忆建议失败。");
      return;
    }

    setMemories(data?.memories || []);
    setMemorySuggestion(null);
    await loadActionLogs();
  }

  async function toggleMemory(memory: Memory) {
    const response = await fetch("/api/ai/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryId: memory.id, enabled: !memory.enabled }),
    });
    const data = await response.json().catch(() => null) as { memories?: Memory[]; error?: string } | null;
    if (!response.ok) {
      setError(data?.error || "更新记忆失败。");
      return;
    }
    setMemories(data?.memories || []);
  }

  async function deleteMemory(memoryId: string) {
    const response = await fetch("/api/ai/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryId }),
    });
    const data = await response.json().catch(() => null) as { memories?: Memory[]; error?: string } | null;
    if (!response.ok) {
      setError(data?.error || "删除记忆失败。");
      return;
    }
    setMemories(data?.memories || []);
    if (editingMemoryId === memoryId) resetMemoryForm();
  }

  async function generateTaskDrafts() {
    const prompt = taskIdea.trim();
    if (!prompt || generatingDrafts) return;

    setGeneratingDrafts(true);
    setError("");
    const response = await fetch("/api/ai/task-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "generate", prompt }),
    });
    const data = await response.json().catch(() => null) as { drafts?: TaskDraft[]; error?: string } | null;
    setGeneratingDrafts(false);

    if (!response.ok) {
      setError(data?.error || "生成任务草稿失败。");
      return;
    }

    setTaskDrafts(data?.drafts || []);
  }

  function updateTaskDraft(index: number, patch: Partial<TaskDraft>) {
    setTaskDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...patch } : draft));
  }

  function removeTaskDraft(index: number) {
    setTaskDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  }

  async function applyTaskDrafts() {
    if (!taskDrafts.length || applyingDrafts) return;

    setApplyingDrafts(true);
    setError("");
    const response = await fetch("/api/ai/task-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "apply", drafts: taskDrafts }),
    });
    const data = await response.json().catch(() => null) as { tasks?: unknown[]; error?: string } | null;
    setApplyingDrafts(false);

    if (!response.ok) {
      setError(data?.error || "写入任务失败。");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `已确认写入 ${data?.tasks?.length || taskDrafts.length} 个任务。你可以到目标页或周计划页继续调整节奏。`,
      },
    ]);
    setTaskDrafts([]);
    setTaskIdea("");
    await loadActionLogs();
  }

  async function generateProgressDrafts() {
    const report = progressReport.trim();
    if (!report || generatingProgress) return;

    setGeneratingProgress(true);
    setError("");
    const response = await fetch("/api/ai/progress-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "generate", report }),
    });
    const data = await response.json().catch(() => null) as { drafts?: ProgressDraft[]; error?: string } | null;
    setGeneratingProgress(false);

    if (!response.ok) {
      setError(data?.error || "解析进度汇报失败。");
      return;
    }

    setProgressDrafts(data?.drafts || []);
    if (!data?.drafts?.length) {
      setError("暂时没有匹配到可同步的任务，可以换一种说法或先去任务页补充任务。");
    }
  }

  function updateProgressDraft(index: number, patch: Partial<ProgressDraft>) {
    setProgressDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...patch } : draft));
  }

  function removeProgressDraft(index: number) {
    setProgressDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  }

  async function applyProgressDrafts() {
    if (!progressDrafts.length || applyingProgress) return;

    setApplyingProgress(true);
    setError("");
    const response = await fetch("/api/ai/progress-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "apply", drafts: progressDrafts }),
    });
    const data = await response.json().catch(() => null) as { logs?: unknown[]; error?: string } | null;
    setApplyingProgress(false);

    if (!response.ok) {
      setError(data?.error || "同步进度失败。");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `已同步 ${data?.logs?.length || progressDrafts.length} 条进度记录，并更新对应任务完成量。`,
      },
    ]);
    setProgressDrafts([]);
    setProgressReport("");
    await loadActionLogs();
  }

  async function generateActionDrafts(item: DiagnosisItem) {
    if (generatingActions) return;

    setGeneratingActions(item.id);
    setError("");
    const response = await fetch("/api/ai/action-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "generate", diagnosis: item }),
    });
    const data = await response.json().catch(() => null) as { drafts?: ActionDraft[]; error?: string } | null;
    setGeneratingActions("");

    if (!response.ok) {
      setError(data?.error || "生成行动草稿失败。");
      return;
    }

    setActionDrafts(data?.drafts || []);
    if (!data?.drafts?.length) {
      setError("这条诊断暂时没有可自动生成的行动草稿，可以先手动调整任务。");
    }
  }

  function removeActionDraft(index: number) {
    setActionDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  }

  async function applyActionDrafts() {
    if (!actionDrafts.length || applyingActions) return;

    setApplyingActions(true);
    setError("");
    const response = await fetch("/api/ai/action-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "apply", drafts: actionDrafts }),
    });
    const data = await response.json().catch(() => null) as { createdTasks?: unknown[]; updatedTaskIds?: unknown[]; error?: string } | null;
    setApplyingActions(false);

    if (!response.ok) {
      setError(data?.error || "应用行动草稿失败。");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `已应用 ${actionDrafts.length} 个行动草稿：新增 ${data?.createdTasks?.length || 0} 个任务，更新 ${data?.updatedTaskIds?.length || 0} 个任务。`,
      },
    ]);
    setActionDrafts([]);
    await loadDiagnosis();
    await loadActionLogs();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId: activeConversationId || undefined }),
    });
    const data = await response.json().catch(() => null) as {
      reply?: string;
      error?: string;
      conversation?: Conversation;
      memorySuggestion?: MemorySuggestion | null;
    } | null;

    setLoading(false);
    if (!response.ok) {
      setError(data?.error || "AI 顾问暂时不可用。");
      return;
    }

    if (data?.conversation) {
      setActiveConversationId(data.conversation.id);
      setMessages(data.conversation.messages);
      setConversations((current) => [
        data.conversation!,
        ...current.filter((conversation) => conversation.id !== data.conversation!.id),
      ]);
      setMemorySuggestion(data.memorySuggestion || null);
      return;
    }

    setMessages((current) => [...current, { role: "assistant", content: data?.reply || "我没有拿到有效回复，请换个问法再试一次。" }]);
    setMemorySuggestion(data?.memorySuggestion || null);
  }

  return (
    <div className="advisor-page design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>AI 顾问台</h1>
          <span>围绕计划合理性、执行情况和下一步调整做对话分析</span>
        </div>
        <Link className="secondary-action" href="/settings#ai">
          <Settings2 className="h-4 w-4" />
          AI 配置
        </Link>
      </section>

      <section className="advisor-shell">
        <aside className="advisor-context-panel">
          <div className="advisor-orb">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2>Growth Advisor</h2>
          <p>可以直接问：这周安排是否太满、哪个任务应该降优先级、孩子执行偏差说明了什么。</p>
          <Button type="button" onClick={startNewConversation} className="advisor-new-chat">
            <MessageSquarePlus className="h-4 w-4" />
            新对话
          </Button>
          <div className="advisor-prompt-list">
            {["这周计划是否合理？", "哪些任务需要调整？", "孩子最近执行情况怎么样？"].map((prompt) => (
              <button key={prompt} type="button" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <div className="advisor-conversation-list">
            <div className="advisor-list-title">历史对话</div>
            {loadingHistory && <span className="advisor-empty-text">正在加载...</span>}
            {!loadingHistory && conversations.length === 0 && <span className="advisor-empty-text">还没有历史对话</span>}
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn("advisor-conversation-item", activeConversationId === conversation.id && "active")}
              >
                <button type="button" onClick={() => selectConversation(conversation)}>
                  <strong>{conversation.title}</strong>
                  <span>{new Date(conversation.updatedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}</span>
                </button>
                <button type="button" aria-label="删除对话" onClick={() => deleteConversation(conversation.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="advisor-memory-panel">
            <div className="advisor-list-title">长期记忆</div>
            <form onSubmit={saveMemory} className="advisor-memory-form">
              <select name="type" value={memoryForm.type} onChange={handleMemoryFormChange}>
                {Object.entries(memoryTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Input
                name="title"
                value={memoryForm.title}
                onChange={handleMemoryFormChange}
                placeholder="记忆标题"
              />
              <textarea
                name="content"
                value={memoryForm.content}
                onChange={handleMemoryFormChange}
                placeholder="例如：周中不安排超过 3 个高强度任务"
              />
              <div className="advisor-memory-actions">
                <Button type="submit" disabled={!memoryForm.title.trim() || !memoryForm.content.trim() || savingMemory}>
                  {savingMemory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingMemoryId ? "更新" : "保存"}
                </Button>
                {editingMemoryId && (
                  <button type="button" onClick={resetMemoryForm}>
                    取消
                  </button>
                )}
              </div>
            </form>
            <div className="advisor-memory-list">
              {memories.length === 0 && <span className="advisor-empty-text">还没有长期记忆</span>}
              {memories.map((memory) => (
                <article key={memory.id} className={cn("advisor-memory-card", !memory.enabled && "disabled")}>
                  <div>
                    <span>{memoryTypeLabels[memory.type]}</span>
                    <strong>{memory.title}</strong>
                  </div>
                  <p>{memory.content}</p>
                  <div className="advisor-memory-card-actions">
                    <button type="button" onClick={() => toggleMemory(memory)}>
                      {memory.enabled ? "启用中" : "已停用"}
                    </button>
                    <button type="button" aria-label="编辑记忆" onClick={() => editMemory(memory)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="删除记忆" onClick={() => deleteMemory(memory.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="advisor-log-panel">
            <div className="advisor-list-title">最近操作</div>
            <div className="advisor-log-list">
              {actionLogs.length === 0 && <span className="advisor-empty-text">还没有 AI 操作记录</span>}
              {actionLogs.slice(0, 6).map((log) => (
                <article key={log.id} className="advisor-log-card">
                  <strong>{log.title}</strong>
                  <p>{log.summary}</p>
                  <span>{new Date(log.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <div className="advisor-chat-panel">
          <div className="advisor-chat-heading">
            <div>
              <h2>{activeConversation?.title || "新的 AI 对话"}</h2>
              <span>{activeConversation ? "这段对话会持续保存，可随时继续。" : "发送第一条消息后会自动保存。"}</span>
            </div>
          </div>
          {memorySuggestion && (
            <div className="advisor-suggestion-panel">
              <div>
                <span>{memoryTypeLabels[memorySuggestion.type]}</span>
                <strong>{memorySuggestion.title}</strong>
              </div>
              <p>{memorySuggestion.content}</p>
              <div>
                <Button type="button" onClick={saveMemorySuggestion} disabled={savingSuggestion}>
                  {savingSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存为记忆
                </Button>
                <button type="button" onClick={() => setMemorySuggestion(null)}>
                  忽略
                </button>
              </div>
            </div>
          )}
          <div className="advisor-draft-panel">
            <div className="advisor-draft-head">
              <div>
                <h3>任务拆解</h3>
                <span>把一个想法变成可确认写入的任务草稿</span>
              </div>
              {taskDrafts.length > 0 && (
                <Button type="button" onClick={applyTaskDrafts} disabled={applyingDrafts}>
                  {applyingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  确认写入
                </Button>
              )}
            </div>
            <div className="advisor-draft-input">
              <textarea
                value={taskIdea}
                onChange={(event) => setTaskIdea(event.target.value)}
                placeholder="例如：我想两周内把英语阅读补起来，每天一点，但不要安排太满。"
              />
              <Button type="button" onClick={generateTaskDrafts} disabled={!taskIdea.trim() || generatingDrafts}>
                {generatingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                生成草稿
              </Button>
            </div>
            {taskDrafts.length > 0 && (
              <div className="advisor-draft-list">
                {taskDrafts.map((draft, index) => (
                  <article key={`${draft.title}-${index}`} className="advisor-draft-card">
                    <div className="advisor-draft-card-head">
                      <Input
                        value={draft.title}
                        onChange={(event) => updateTaskDraft(index, { title: event.target.value })}
                        aria-label="任务标题"
                      />
                      <button type="button" aria-label="移除任务草稿" onClick={() => removeTaskDraft(index)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateTaskDraft(index, { description: event.target.value })}
                      aria-label="任务描述"
                    />
                    <div className="advisor-draft-fields">
                      <Input
                        value={draft.category}
                        onChange={(event) => updateTaskDraft(index, { category: event.target.value })}
                        aria-label="分类"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={draft.target}
                        onChange={(event) => updateTaskDraft(index, { target: Math.max(1, Number(event.target.value || 1)) })}
                        aria-label="目标量"
                      />
                      <Input
                        value={draft.unit}
                        onChange={(event) => updateTaskDraft(index, { unit: event.target.value })}
                        aria-label="单位"
                      />
                      <Input
                        value={draft.dailyTarget}
                        onChange={(event) => updateTaskDraft(index, { dailyTarget: event.target.value })}
                        aria-label="执行频率"
                      />
                      <select
                        value={draft.priority}
                        onChange={(event) => updateTaskDraft(index, { priority: event.target.value as TaskDraft["priority"] })}
                        aria-label="优先级"
                      >
                        <option value="高">高</option>
                        <option value="中">中</option>
                        <option value="低">低</option>
                      </select>
                      <select
                        value={draft.executionMode}
                        onChange={(event) => updateTaskDraft(index, { executionMode: event.target.value as TaskDraft["executionMode"] })}
                        aria-label="执行方式"
                      >
                        <option value="孩子自主">孩子自主</option>
                        <option value="家长陪练">家长陪练</option>
                        <option value="亲子共学">亲子共学</option>
                        <option value="家长验收">家长验收</option>
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="advisor-progress-panel">
            <div className="advisor-draft-head">
              <div>
                <h3>进度汇报</h3>
                <span>把今天完成情况匹配到任务，并生成日志</span>
              </div>
              {progressDrafts.length > 0 && (
                <Button type="button" onClick={applyProgressDrafts} disabled={applyingProgress}>
                  {applyingProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  确认同步
                </Button>
              )}
            </div>
            <div className="advisor-draft-input">
              <textarea
                value={progressReport}
                onChange={(event) => setProgressReport(event.target.value)}
                placeholder="例如：今天做了 2 篇英语阅读，数学错题整理了 30 分钟，文书大纲还没写完。"
              />
              <Button type="button" onClick={generateProgressDrafts} disabled={!progressReport.trim() || generatingProgress}>
                {generatingProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                解析汇报
              </Button>
            </div>
            {progressDrafts.length > 0 && (
              <div className="advisor-progress-list">
                {progressDrafts.map((draft, index) => (
                  <article key={`${draft.taskId}-${index}`} className="advisor-progress-card">
                    <div className="advisor-progress-card-head">
                      <strong>{draft.taskTitle}</strong>
                      <button type="button" aria-label="移除进度草稿" onClick={() => removeProgressDraft(index)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="advisor-progress-fields">
                      <Input
                        value={draft.category}
                        onChange={(event) => updateProgressDraft(index, { category: event.target.value })}
                        aria-label="记录分类"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={draft.amount}
                        onChange={(event) => updateProgressDraft(index, { amount: Math.max(0, Number(event.target.value || 0)) })}
                        aria-label="完成量"
                      />
                      <Input
                        value={draft.unit}
                        onChange={(event) => updateProgressDraft(index, { unit: event.target.value })}
                        aria-label="单位"
                      />
                    </div>
                    <textarea
                      value={draft.summary}
                      onChange={(event) => updateProgressDraft(index, { summary: event.target.value })}
                      aria-label="日志摘要"
                    />
                    <textarea
                      value={draft.note}
                      onChange={(event) => updateProgressDraft(index, { note: event.target.value })}
                      aria-label="备注"
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="advisor-diagnosis-panel">
            <div className="advisor-draft-head">
              <div>
                <h3>计划诊断</h3>
                <span>{diagnosis ? diagnosis.summary : "检查任务节奏、拆解粒度和推进风险"}</span>
              </div>
              <Button type="button" onClick={() => loadDiagnosis()} disabled={loadingDiagnosis}>
                {loadingDiagnosis ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                重新诊断
              </Button>
            </div>
            <div className="advisor-diagnosis-list">
              {loadingDiagnosis && !diagnosis && (
                <div className="advisor-diagnosis-empty">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在分析当前计划...
                </div>
              )}
              {diagnosis?.items.map((item) => (
                <article key={item.id} className={cn("advisor-diagnosis-card", item.severity)}>
                  <div>
                    <span><AlertTriangle className="h-4 w-4" />{severityLabels[item.severity]}</span>
                    <strong>{item.title}</strong>
                  </div>
                  <p>{item.evidence}</p>
                  <em>{item.suggestion}</em>
                  <button type="button" onClick={() => generateActionDrafts(item)} disabled={Boolean(generatingActions)}>
                    {generatingActions === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    生成行动草稿
                  </button>
                </article>
              ))}
            </div>
            {actionDrafts.length > 0 && (
              <div className="advisor-action-panel">
                <div className="advisor-action-head">
                  <div>
                    <strong>行动草稿</strong>
                    <span>确认后才会修改任务</span>
                  </div>
                  <Button type="button" onClick={applyActionDrafts} disabled={applyingActions}>
                    {applyingActions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    应用草稿
                  </Button>
                </div>
                <div className="advisor-action-list">
                  {actionDrafts.map((draft, index) => (
                    <article key={draft.id || `${draft.type}-${index}`} className="advisor-action-card">
                      <div>
                        <span>{draft.type === "create_task" ? "新增任务" : "更新任务"}</span>
                        <strong>{draft.title}</strong>
                        <button type="button" aria-label="移除行动草稿" onClick={() => removeActionDraft(index)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p>{draft.reason}</p>
                      {draft.type === "update_task" ? (
                        <em>
                          {Object.entries(draft.patch)
                            .filter(([, value]) => value !== undefined && value !== "")
                            .map(([key, value]) => `${key}: ${value}`)
                            .join("；")}
                        </em>
                      ) : (
                        <em>{draft.task.category}｜{draft.task.target}{draft.task.unit}｜{draft.task.dailyTarget}</em>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="advisor-message-list">
            {messages.map((message, index) => (
              <article key={message.id || `${message.role}-${index}`} className={cn("advisor-message", message.role === "user" && "user")}>
                <span>{message.role === "user" ? "你" : <Bot className="h-4 w-4" />}</span>
                <p>{message.content}</p>
              </article>
            ))}
            {loading && (
              <article className="advisor-message">
                <span><Loader2 className="h-4 w-4 animate-spin" /></span>
                <p>正在结合目标和周计划分析...</p>
              </article>
            )}
          </div>

          {error && <div className="weekly-save-feedback error">{error}</div>}

          <form onSubmit={handleSubmit} className="advisor-input-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="问问计划安排、执行情况或下一步调整..."
            />
            <Button type="submit" disabled={!input.trim() || loading} className="bg-[#23B87A] hover:bg-[#1FA36C] rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
