import { z } from "zod";
import { chatWithCustomerAgent } from "@/lib/customer-chat";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })).min(1).max(20),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "对话内容格式不正确，每条消息最多 4000 字" }, { status: 400 });
    if (parsed.data.messages.at(-1)?.role !== "user") return Response.json({ error: "最后一条消息必须来自用户" }, { status: 400 });
    const result = await chatWithCustomerAgent(getDb(), id, parsed.data.messages);
    return Response.json({ message: { role: "assistant", content: result.answer }, sources: result.sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    if (message.includes("客户不存在")) return Response.json({ error: message }, { status: 404 });
    console.error("[customer-chat] Agent 对话失败", error);
    return Response.json({ error: `Agent 暂时不可用：${message.slice(0, 240)}` }, { status: 503 });
  }
}
