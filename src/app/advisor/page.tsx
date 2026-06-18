"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, MessageSquarePlus, Send, Settings2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "我会结合目标地图、周计划和成长记录，帮你判断计划是否合理、执行是否偏离，以及下一步怎么调整。",
};

export default function AdvisorPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
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
    const data = await response.json().catch(() => null) as { reply?: string; error?: string; conversation?: Conversation } | null;

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
      return;
    }

    setMessages((current) => [...current, { role: "assistant", content: data?.reply || "我没有拿到有效回复，请换个问法再试一次。" }]);
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
        </aside>

        <div className="advisor-chat-panel">
          <div className="advisor-chat-heading">
            <div>
              <h2>{activeConversation?.title || "新的 AI 对话"}</h2>
              <span>{activeConversation ? "这段对话会持续保存，可随时继续。" : "发送第一条消息后会自动保存。"}</span>
            </div>
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
