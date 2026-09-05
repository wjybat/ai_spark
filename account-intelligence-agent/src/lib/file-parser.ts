import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function extractFileText(file: File): Promise<string> {
  const suffix = file.name.toLowerCase().split(".").pop();
  if (suffix === "txt" || suffix === "md") return file.text();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (suffix === "docx") return (await mammoth.extractRawText({ buffer })).value.trim();
  if (suffix === "pdf") {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    return (Array.isArray(result.text) ? result.text.join("\n") : result.text).trim();
  }
  throw new Error("仅支持 PDF、DOCX、Markdown 和 TXT 文件");
}
