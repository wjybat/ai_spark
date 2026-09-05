"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Icon } from "./ui/icons";

interface Fact {
  readonly fact_id: string;
  readonly text: string;
  readonly claim_ids: readonly string[];
  readonly status: string;
}

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly facts: readonly Fact[];
}

const SUGGESTIONS = ["查看当前区域排名", "比较当前区域前两名", "拆解第一名的关键维度", "查看第一名的证据"];

function markdownWithFactLinks(content: string, facts: readonly Fact[]): string {
  return content.replace(/\[\[(fact_\d+)\]\]/g, (_marker, factId: string) => {
    const index = facts.findIndex((fact) => fact.fact_id === factId);
    return `[${index < 0 ? "?" : index + 1}](#agent-${factId})`;
  });
}

function MarkdownAnswer({ content, facts }: { content: string; facts: readonly Fact[] }): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          const factId = href?.match(/^#agent-(fact_\d+)$/)?.[1];
          if (factId !== undefined) {
            const fact = facts.find((item) => item.fact_id === factId);
            return <sup className="fact-sup" title={fact?.text ?? ""}>[{children}]</sup>;
          }
          return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
        },
      }}
    >
      {markdownWithFactLinks(content, facts)}
    </ReactMarkdown>
  );
}

/** 右侧 Agent 抽屉：监听 agent:open / agent:ask 事件，可直接从洞察 chips 发问 */
export function AgentDrawer(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = (): void => setOpen(true);
    const onAsk = (event: Event): void => {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      if (typeof detail?.message === "string") {
        setOpen(true);
        void send(detail.message);
      }
    };
    window.addEventListener("agent:open", onOpen);
    window.addEventListener("agent:ask", onAsk);
    return () => {
      window.removeEventListener("agent:open", onOpen);
      window.removeEventListener("agent:ask", onAsk);
    };
  }, []);

  async function ensureSession(): Promise<string> {
    if (sessionId !== null) return sessionId;
    const response = await fetch("/api/agent/sessions", { method: "POST" });
    const body = (await response.json()) as { data: { session_id: string } };
    setSessionId(body.data.session_id);
    return body.data.session_id;
  }

  async function send(text: string): Promise<void> {
    const message = text.trim();
    if (message === "" || pending) return;
    setPending(true);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: message, facts: [] }]);
    try {
      const currentSession = await ensureSession();
      const response = await fetch(`/api/agent/sessions/${currentSession}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = (await response.json()) as {
        data?: { answer: string; facts: readonly Fact[] };
        error?: { message: string };
      };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: body.data?.answer ?? body.error?.message ?? "请求失败",
          facts: body.data?.facts ?? [],
        },
      ]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <aside className="agent-drawer">
      <header>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="sparkles" size={16} className="ic-primary" />
          AI Agent
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            window.dispatchEvent(new CustomEvent("agent:close"));
          }}
          aria-label="关闭"
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-3)", fontSize: 15 }}
        >
          ✕
        </button>
      </header>

      <div ref={scrollRef} className="agent-messages">
        {messages.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 12, marginBottom: 10 }}>
            只基于已保存的扫描结果回答（Verified Claim / Metric / Score）。试试：
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                style={{ display: "block", margin: "6px 0", width: "100%" }}
                onClick={() => void send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} style={{ marginBottom: 12 }}>
            {message.role === "user" ? (
              <div className="msg-user-row">
                <span className="msg-user">{message.content}</span>
              </div>
            ) : (
              <div className="msg-ai">
                <span className="ai-avatar">
                  <Icon name="robot" size={13} />
                </span>
                <div className="ai-card agent-markdown">
                  <MarkdownAnswer content={message.content} facts={message.facts} />
                  {message.facts.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary className="small" style={{ cursor: "pointer", color: "var(--text-3)" }}>
                        引用 {message.facts.length} 条事实（Claim 溯源）
                      </summary>
                      {message.facts.map((fact) => (
                        <div key={fact.fact_id} className="quote">
                          <div>{fact.text}</div>
                          <div className="small muted">
                            {fact.claim_ids.length > 0
                              ? `Claims: ${fact.claim_ids.slice(0, 2).join(", ")} · 状态 ${fact.status}`
                              : `状态 ${fact.status}`}
                          </div>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {pending && <div className="small muted">Agent 分析中…</div>}
      </div>

      <form
        className="agent-input"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="询问排名 / 对比 / 指标解释 / 证据…"
        />
        <button type="submit" className="btn-scan" disabled={pending || input.trim() === ""}>
          发送
        </button>
      </form>
    </aside>
  );
}
