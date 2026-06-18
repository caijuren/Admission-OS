import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, writeData, type AiMemory, type AiMemoryType } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

const memoryTypes: AiMemoryType[] = ["preference", "student", "goal", "principle", "decision"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function dataErrorResponse(error: unknown) {
  console.error("AI memories API error:", error);
  return NextResponse.json({ error: "AI 记忆暂时不可用。" }, { status: 500 });
}

function normalizeMemoryType(value: unknown): AiMemoryType {
  const nextType = String(value || "preference") as AiMemoryType;
  return memoryTypes.includes(nextType) ? nextType : "preference";
}

function sortMemories(memories: AiMemory[]) {
  return [...memories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readData(auth.user.id);
    const response = NextResponse.json({ memories: sortMemories(data.aiMemories || []) });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as Partial<AiMemory>;
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空。" }, { status: 400 });
    }

    const data = await readData(auth.user.id);
    const now = new Date().toISOString();
    const memory: AiMemory = {
      id: uid("ai-memory"),
      type: normalizeMemoryType(body.type),
      title,
      content,
      enabled: body.enabled ?? true,
      sourceConversationId: body.sourceConversationId || undefined,
      createdAt: now,
      updatedAt: now,
    };

    data.aiMemories = [memory, ...(data.aiMemories || [])];
    data.aiActionLogs = [
      {
        id: uid("ai-action"),
        type: "memory_save",
        title: "保存长期记忆",
        summary: `保存「${memory.title}」为长期记忆。`,
        details: {
          memoryId: memory.id,
          memoryType: memory.type,
        },
        createdAt: now,
      },
      ...(data.aiActionLogs || []),
    ];
    await writeData(auth.user.id, data);

    const response = NextResponse.json({ memory, memories: sortMemories(data.aiMemories) });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as Partial<AiMemory> & { memoryId?: string };
    const memoryId = String(body.memoryId || body.id || "").trim();
    if (!memoryId) {
      return NextResponse.json({ error: "memoryId 不能为空。" }, { status: 400 });
    }

    const data = await readData(auth.user.id);
    const memories = data.aiMemories || [];
    const existing = memories.find((memory) => memory.id === memoryId);
    if (!existing) {
      return NextResponse.json({ error: "找不到这条记忆。" }, { status: 404 });
    }

    const updated: AiMemory = {
      ...existing,
      type: body.type ? normalizeMemoryType(body.type) : existing.type,
      title: body.title === undefined ? existing.title : String(body.title || "").trim(),
      content: body.content === undefined ? existing.content : String(body.content || "").trim(),
      enabled: body.enabled === undefined ? existing.enabled : Boolean(body.enabled),
      updatedAt: new Date().toISOString(),
    };

    if (!updated.title || !updated.content) {
      return NextResponse.json({ error: "标题和内容不能为空。" }, { status: 400 });
    }

    data.aiMemories = memories.map((memory) => memory.id === memoryId ? updated : memory);
    await writeData(auth.user.id, data);

    const response = NextResponse.json({ memory: updated, memories: sortMemories(data.aiMemories) });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { memoryId?: string };
    const memoryId = String(body.memoryId || "").trim();
    if (!memoryId) {
      return NextResponse.json({ error: "memoryId 不能为空。" }, { status: 400 });
    }

    const data = await readData(auth.user.id);
    data.aiMemories = (data.aiMemories || []).filter((memory) => memory.id !== memoryId);
    await writeData(auth.user.id, data);

    const response = NextResponse.json({ memories: sortMemories(data.aiMemories) });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
