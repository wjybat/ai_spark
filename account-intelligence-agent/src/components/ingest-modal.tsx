"use client";

import { AlertCircle, CheckCircle2, FileText, FileUp, Loader2, Upload, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface CustomerOption { id: string; name: string; country: string | null }

export function IngestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    setMessage(""); setSuccess(false); setSelectedFile(null);
    fetch("/api/v1/customers?page_size=100").then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then((data) => setCustomers(data.items || [])).catch(() => setMessage("客户列表加载失败，请关闭后重试"));
    requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(""); setSuccess(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const customerId = String(form.get("customer_id") || "");
    const customerName = customers.find((customer) => customer.id === customerId)?.name || "未知客户";
    const materialTitle = String(form.get("title") || selectedFile?.name || "未命名材料");
    try {
      let response: Response;
      if (inputMode === "file") {
        if (!selectedFile) throw new Error("请选择需要解析的文件");
        const upload = new FormData();
        upload.set("file", selectedFile);
        upload.set("customer_id", customerId);
        upload.set("source_type", String(form.get("source_type")));
        upload.set("source_system", "manual-upload");
        if (selectedFile.size > 30 * 1024 * 1024) throw new Error("文件不能超过 30MB");
        upload.set("external_id", `upload-${Date.now()}-${selectedFile.name}-${selectedFile.lastModified}`);
        upload.set("title", materialTitle);
        upload.set("occurred_at", new Date().toISOString());
        response = await fetch("/api/v1/ingest/file", { method: "POST", body: upload });
      } else {
        const body = {
          source_type: form.get("source_type"), source_system: "manual-web", external_id: `manual-${Date.now()}`,
          customer: { id: form.get("customer_id") }, title: form.get("title"), content: form.get("content"),
          occurred_at: new Date().toISOString(), metadata: {}, auto_create_customer: false,
        };
        response = await fetch("/api/v1/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "提交失败");
      setSuccess(true);
      setMessage(inputMode === "file" ? "文件已解析并加入分析任务，可关闭窗口继续浏览" : "材料已加入分析任务，可关闭窗口继续浏览");
      window.dispatchEvent(new CustomEvent("analysis-job-created", { detail: { jobId: result.job_id, customerId, customerName, title: materialTitle } }));
      formElement.reset(); setSelectedFile(null);
      window.dispatchEvent(new Event("customer-ingested"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "提交失败"); }
    finally { setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="ingest-modal-title">
    <div className="modal-header"><div><span className="modal-icon"><Upload size={19} /></span><h2 id="ingest-modal-title">更新材料</h2><p>为已有客户补充文本材料或上传文件，由 Pi Agent 自动分析</p></div><button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="关闭"><X size={19} /></button></div>
    <form onSubmit={submit}>
      <label>选择已有客户<select ref={firstFieldRef} name="customer_id" required defaultValue=""><option value="" disabled>{customers.length ? "请选择客户" : "暂无客户，请先新建客户"}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.country ? ` · ${customer.country}` : ""}</option>)}</select></label>
      <div className="material-mode"><button type="button" className={inputMode === "text" ? "active" : ""} onClick={() => { setInputMode("text"); setMessage(""); }}><FileText size={16} />粘贴文本</button><button type="button" className={inputMode === "file" ? "active" : ""} onClick={() => { setInputMode("file"); setMessage(""); }}><FileUp size={16} />上传文件</button></div>
      <div className="form-row"><label>材料类型<select name="source_type" defaultValue="MEETING"><option value="MEETING">会议纪要</option><option value="CRM_FOLLOWUP">CRM 跟进</option><option value="RESEARCH">调研材料</option><option value="DOCUMENT">客户文档</option><option value="MANUAL_NOTE">人工记录</option></select></label><label>标题<input name="title" required placeholder={inputMode === "file" ? "文件或材料标题" : "本次沟通主题"} /></label></div>
      {inputMode === "text" ? <label>材料正文<textarea name="content" required rows={8} placeholder="粘贴客户沟通内容，系统会抽取事件、事实和下一步行动…" /></label> : <label className="file-upload-label">客户材料<div className={`file-dropzone ${selectedFile ? "has-file" : ""}`}><input type="file" required accept=".pdf,.docx,.md,.txt" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /><span className="file-drop-icon"><FileUp size={24} /></span>{selectedFile ? <><b>{selectedFile.name}</b><small>{(selectedFile.size / 1024).toFixed(1)} KB · 点击可重新选择</small></> : <><b>点击选择或拖入文件</b><small>支持 PDF、DOCX、Markdown、TXT，最大 30MB</small></>}</div></label>}
      {message && <p className={`form-message ${success ? "success" : "error"}`} role="status" aria-live="polite">{success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{message}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={loading}>取消</button><button className="primary-button" disabled={loading || !customers.length}>{loading ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}提交材料</button></div>
    </form>
  </div></div>;
}
