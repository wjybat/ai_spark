import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { createMarkdownRenderer } from "../src/ui/markdown.js";

const windows: JSDOM[] = [];
function renderer() {
  const dom = new JSDOM("");
  windows.push(dom);
  return createMarkdownRenderer(createDOMPurify(dom.window));
}
function content(markup: string) {
  const dom = new JSDOM(markup);
  windows.push(dom);
  return dom.window.document.body;
}
afterEach(() => { windows.splice(0).forEach(dom => dom.window.close()); });

describe("safe Agent Markdown rendering", () => {
  it("renders Chinese headings, emphasis, nested lists, quotes and code", () => {
    const source = [
      "## 销售结论", "", "**高潜**，*待验证*，~~未确认~~。", "",
      "- 事实", "  - 子项", "", "1. 确认预算", "2. 约定试点", "",
      "> 不替换核心系统", "", "使用 `OMS`。", "",
      "```typescript", "const value = '<script>alert(1)</script>';", "```",
    ].join("\n");
    const body = content(renderer()(source));
    expect(body.querySelector("h2")?.textContent).toBe("销售结论");
    expect(body.querySelector("strong")?.textContent).toBe("高潜");
    expect(body.querySelector("em")?.textContent).toBe("待验证");
    expect(body.querySelector("del")?.textContent).toBe("未确认");
    expect(body.querySelector("ul ul li")?.textContent).toBe("子项");
    expect(body.querySelectorAll("ol > li")).toHaveLength(2);
    expect(body.querySelector("blockquote")?.textContent).toContain("不替换");
    expect(body.querySelector("pre code")?.textContent).toContain("<script>alert(1)</script>");
    expect(body.querySelector("script")).toBeNull();
  });

  it("renders GFM tables, disabled tasks, hard line breaks and safe citation links", () => {
    const body = content(renderer()([
      "| 项目 | 判断 |", "| --- | ---: |", "| 预算 | **待确认** |", "",
      "- [x] 读取资料", "- [ ] 确认客户", "",
      "Hi [Name],", "Welcome.", "", "[原文](https://example.com/report \"年报\")",
    ].join("\n")));
    expect(body.querySelectorAll("table th")).toHaveLength(2);
    expect(body.querySelector("td strong")?.textContent).toBe("待确认");
    expect(body.querySelectorAll('input[type="checkbox"][disabled]')).toHaveLength(2);
    expect(body.querySelector('input[checked]')).not.toBeNull();
    expect(body.querySelector("br")).not.toBeNull();
    const link = body.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/report");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("removes active HTML, tracking images, unsafe links and CSS attributes", () => {
    const body = content(renderer()([
      '<script>alert(1)</script><iframe src="https://evil.example"></iframe>',
      '<svg onload="alert(1)"><circle></circle></svg>',
      '<img src="https://evil.example/track" onerror="alert(1)">',
      '<a href="javascript:alert(1)" onclick="alert(1)">unsafe</a>',
      '<a href="data:text/html,boom">data</a><a href="file:///etc/passwd">file</a>',
      '<a href="java&#x73;cript:alert(1)">encoded</a>',
      '<p id="root" class="app" style="position:fixed" data-x="1">kept text</p>',
      '<input type="submit" onclick="alert(1)">',
    ].join("\n")));
    expect(body.querySelectorAll("script,iframe,svg,img,style,form")).toHaveLength(0);
    expect(body.querySelectorAll("[onclick],[onerror],[style],[id],[data-x]")).toHaveLength(0);
    expect(body.querySelectorAll("a[href]")).toHaveLength(0);
    expect(body.querySelector('input[type="checkbox"][disabled]')).not.toBeNull();
    expect(body.textContent).toContain("kept text");
  });

  it("supports inline fragments without nesting block elements in paragraphs", () => {
    const body = content(renderer()("**确认** `ERP` [依据](https://example.com)", true));
    expect(body.querySelector("p,h1,h2,ul,div")).toBeNull();
    expect(body.querySelector("strong")?.textContent).toBe("确认");
  });

  it("preserves plain and empty content without changing the input", () => {
    const render = renderer();
    expect(render(null)).toBe("");
    expect(render(undefined)).toBe("");
    expect(content(render(93)).textContent?.trim()).toBe("93");
    const source = "预算待确认，不等于零预算。";
    expect(content(render(source)).textContent?.trim()).toBe(source);
    expect(source).toBe("预算待确认，不等于零预算。");
  });
});
