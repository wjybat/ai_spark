import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { getDb, transaction } from "@/lib/db";
import { extractFileText } from "@/lib/file-parser";
import { ingest } from "@/lib/ingestion";
import { ingestSchema } from "@/lib/types";
import { apiError, makeId } from "@/lib/utils";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("缺少上传文件");
    const maxBytes = Number(process.env.MAX_UPLOAD_MB || 30) * 1024 * 1024;
    if (file.size > maxBytes) throw new Error(`文件不能超过 ${process.env.MAX_UPLOAD_MB || 30}MB`);
    const content = await extractFileText(file);
    if (!content.trim()) throw new Error("文件中没有可提取的文本，扫描版 PDF 暂不支持 OCR");
    const directory = process.env.FILE_STORAGE_PATH || "./data/files";
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${makeId("file")}${extname(file.name).toLowerCase()}`);
    await writeFile(path, Buffer.from(await file.arrayBuffer()));
    const input = ingestSchema.parse({
      source_type: String(form.get("source_type") || "DOCUMENT").toUpperCase(),
      source_system: String(form.get("source_system") || "manual-upload"),
      external_id: String(form.get("external_id") || `${file.name}-${file.lastModified}`),
      customer: { id: form.get("customer_id") || undefined, name: form.get("customer_name") || undefined },
      title: String(form.get("title") || file.name), content,
      occurred_at: form.get("occurred_at") || undefined, author: form.get("author") || undefined, metadata: { filename: file.name, size: file.size },
    });
    const result = transaction(getDb(), () => ingest(getDb(), input, path));
    return Response.json(result, { status: result.status === "already_exists" ? 200 : 202 });
  } catch (error) { return apiError(error); }
}
