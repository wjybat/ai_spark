import DOMPurify from "dompurify";
import { createMarkdownRenderer } from "./markdown.js";

export const renderMarkdown = createMarkdownRenderer(DOMPurify);
