import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, writeData } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

function dataErrorResponse(error: unknown) {
  console.error("AI conversations API error:", error);
  return NextResponse.json({ error: "AI 对话历史暂时不可用。" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readData(auth.user.id);
    const conversations = (data.aiConversations || []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const response = NextResponse.json({ conversations });
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

    const body = await request.json().catch(() => ({})) as { conversationId?: string };
    const conversationId = String(body.conversationId || "").trim();
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId 不能为空。" }, { status: 400 });
    }

    const data = await readData(auth.user.id);
    data.aiConversations = (data.aiConversations || []).filter((item) => item.id !== conversationId);
    await writeData(auth.user.id, data);

    const response = NextResponse.json({ conversations: data.aiConversations });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
