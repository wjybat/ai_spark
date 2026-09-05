import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatMarkdown } from "../src/components/chat-markdown";

describe("Agent 回答 Markdown 渲染", () => {
  it("将标题、列表和加粗转换为语义化 HTML，而不是显示原始标记", () => {
    const html = renderToStaticMarkup(<ChatMarkdown content={"### 当前进展\n\n- **客户状态**：活跃\n- **当前工作**：推进开发"} />);
    expect(html).toContain("<h3>当前进展</h3>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>客户状态</strong>");
    expect(html).not.toContain("###");
  });

  it("支持 GFM 表格和任务列表", () => {
    const html = renderToStaticMarkup(<ChatMarkdown content={"|事项|状态|\n|---|---|\n|PRD|完成|\n\n- [x] 蓝图确认"} />);
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
  });
});
