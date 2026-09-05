"use client";

import { Bot, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

interface ChatSource { id: string; title: string }
interface ChatMessage { id: string; role: "user" | "assistant"; content: string; sources?: ChatSource[] }

const suggestions = ["总结当前客户进展", "目前最大的阻碍是什么？", "建议下一步怎么推进？"];
const storageKey = (customerId: string) => `customer-agent-chat:${customerId}`;

function loadMessages(customerId: string): ChatMessage[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(customerId)) || "[]") as ChatMessage[];
    return Array.isArray(value) ? value.filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string").slice(-30) : [];
  } catch { return []; }
}

function persistMessages(customerId: string, messages: ChatMessage[]) {
  window.localStorage.setItem(storageKey(customerId), JSON.stringify(messages.slice(-30)));
}

function ChatText({ content }: { content: string }) {
  return <p>{content.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</p>;
}

export function CustomerChatDrawer({ customerId, customerName, open, onClose, onOpenSource }: {
  customerId: string;
  customerName: string;
  open: boolean;
  onClose: () => void;
  onOpenSource: (source: ChatSource) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadMessages(customerId));
    setInput("");
    setError("");
  }, [customerId]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, sending]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const pending = [...messages, userMessage];
    setMessages(pending);
    persistMessages(customerId, pending);
    setInput("");
    setError("");
    setSending(true);
    try {
      const response = await fetch(`/api/v1/customers/${customerId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: pending.slice(-20).map(({ role, content: messageContent }) => ({ role, content: messageContent })) }),
      });
      const data = await response.json() as { message?: { role: "assistant"; content: string }; sources?: ChatSource[]; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "Agent 没有返回回答");
      const completed = [...pending, { id: crypto.randomUUID(), ...data.message, sources: data.sources || [] } as ChatMessage];
      setMessages(completed);
      persistMessages(customerId, completed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "对话失败，请稍后重试");
    } finally { setSending(false); }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
    window.localStorage.removeItem(storageKey(customerId));
    inputRef.current?.focus();
  }

  if (!open) return null;
  return <>
    <button className="chat-scrim" aria-label="关闭 Agent 对话" onClick={onClose} />
    <aside className="chat-drawer" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <header>
        <div><span><Bot size={19} /></span><div><small>客户情报 Agent</small><h2 id="chat-title">与 Agent 对话</h2></div></div>
        <div className="chat-header-actions">{messages.length > 0 && <button type="button" title="清空对话" aria-label="清空对话" onClick={clearChat}><Trash2 size={15} /></button>}<button type="button" aria-label="关闭 Agent 对话" onClick={onClose}><X size={18} /></button></div>
      </header>
      <div className="chat-context"><Sparkles size={14} /><span>正在基于 <b>{customerName}</b> 的客户材料回答</span><em>只读</em></div>
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && <div className="chat-welcome"><span><Bot size={24} /></span><b>你好，我是客户情报 Agent</b><p>我可以查阅该客户的画像、事实、时间线和来源材料，帮助你总结进展、分析阻碍并规划下一步。</p><div>{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}>{suggestion}</button>)}</div></div>}
        {messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}><div>{message.role === "assistant" ? <Bot size={15} /> : "你"}</div><section><ChatText content={message.content} />{message.sources && message.sources.length > 0 && <footer><span>参考材料</span>{message.sources.map((source) => <button key={source.id} type="button" onClick={() => onOpenSource(source)}>{source.title}</button>)}</footer>}</section></article>)}
        {sending && <article className="chat-message assistant chat-typing"><div><Bot size={15} /></div><section><Loader2 className="spin" size={15} /><span>正在查阅客户材料…</span></section></article>}
        {error && <div className="chat-error" role="alert">{error}<button type="button" onClick={() => setError("")}>关闭</button></div>}
        <div ref={endRef} />
      </div>
      <form className="chat-composer" onSubmit={sendMessage}>
        <textarea ref={inputRef} rows={2} maxLength={4000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder={`询问关于 ${customerName} 的问题…`} aria-label="发送给客户情报 Agent 的消息" disabled={sending} />
        <button type="submit" aria-label="发送消息" disabled={sending || !input.trim()}>{sending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}</button>
        <small>Enter 发送 · Shift + Enter 换行</small>
      </form>
    </aside>
  </>;
}
