import { Marked } from "marked";
import type { DOMPurify } from "dompurify";

const allowedTags = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "b", "em", "i", "del", "s", "a", "code", "pre",
  "blockquote", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "input",
];

/** Shared Markdown renderer. Only sanitized prose markup may reach React. */
export function createMarkdownRenderer(purifier: DOMPurify) {
  const parser = new Marked({ gfm: true, breaks: true });

  purifier.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") ?? "";
      // Restrict generated links to citations/contact links and same-page fragments.
      if (!/^(?:https?:\/\/|mailto:|#)/i.test(href)) node.removeAttribute("href");
      if (node.hasAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (node.tagName === "INPUT") {
      node.setAttribute("type", "checkbox");
      node.setAttribute("disabled", "");
    }
  });

  return function renderMarkdown(value: unknown, inline = false): string {
    const text = typeof value === "string" ? value : value == null ? "" : String(value);
    const source = text.replace(/^[\u200B-\u200F\uFEFF]+/, "");
    const markup = inline
      ? parser.parseInline(source, { async: false })
      : parser.parse(source, { async: false });
    return purifier.sanitize(markup, {
      ALLOWED_TAGS: inline ? ["strong", "b", "em", "i", "del", "s", "a", "code", "br"] : allowedTags,
      ALLOWED_ATTR: ["href", "title", "align", "start", "type", "checked", "disabled"],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
  };
}
