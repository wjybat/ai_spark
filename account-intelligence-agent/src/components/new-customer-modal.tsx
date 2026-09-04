"use client";

import { AlertCircle, Building2, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

export function NewCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    setMessage(""); setSuccess(false);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(""); setSuccess(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const aliases = String(form.get("aliases") || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean);
      const response = await fetch("/api/v1/customers", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), country: form.get("country") || undefined, industry: form.get("industry") || undefined, owner: form.get("owner") || undefined, aliases, profile: {} }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "创建失败");
      setSuccess(true); setMessage(`客户“${result.name}”已创建，可以继续更新材料`);
      formElement.reset();
      window.dispatchEvent(new CustomEvent("customer-created", { detail: result }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "创建失败"); }
    finally { setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}><div className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="new-customer-title">
    <div className="modal-header"><div><span className="modal-icon"><Building2 size={19} /></span><h2 id="new-customer-title">新建客户</h2><p>创建独立客户档案，避免更新材料产生重复客户</p></div><button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="关闭"><X size={19} /></button></div>
    <form onSubmit={submit}>
      <label>客户名称<input ref={firstFieldRef} name="name" required placeholder="例如：Tesco" /></label>
      <div className="form-row"><label>国家/地区<input name="country" placeholder="例如：英国" /></label><label>行业<input name="industry" placeholder="例如：食品零售" /></label></div>
      <div className="form-row"><label>负责人<input name="owner" placeholder="例如：Jack Smith" /></label><label>客户别名<input name="aliases" placeholder="多个别名用逗号分隔" /></label></div>
      {message && <p className={`form-message ${success ? "success" : "error"}`} role="status" aria-live="polite">{success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{message}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={loading}>取消</button><button className="primary-button" disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}创建客户</button></div>
    </form>
  </div></div>;
}
