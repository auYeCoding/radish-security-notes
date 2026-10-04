import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  renderInEntryEnvironment,
  type RenderedInEnvironment,
} from "@renderer/testing/render-in-entry-environment";

import { MarkdownView } from "./markdown-view";

/**
 * 在条目环境里渲染 Markdown 视图, 打开链接的函数接到环境里的假链接桥.
 * @param source Markdown 原文.
 * @returns 渲染结果的容器与渲染所用的环境.
 */
function renderMarkdown(source: string): Promise<RenderedInEnvironment> {
  return renderInEntryEnvironment((environment) => (
    <MarkdownView
      source={source}
      openExternalLink={environment.linkBridge.openExternal}
    />
  ));
}

describe("MarkdownView 标准语法", () => {
  it("六级标题渲染成对应级别的标题", async () => {
    await renderMarkdown(
      "# 一级\n\n## 二级\n\n### 三级\n\n#### 四级\n\n##### 五级\n\n###### 六级",
    );

    ["一级", "二级", "三级", "四级", "五级", "六级"].forEach((name, index) => {
      expect(
        screen.getByRole("heading", { name, level: index + 1 }),
      ).toBeDefined();
    });
  });

  it("段落里的粗体, 斜体与行内代码渲染成对应元素", async () => {
    const { container } = await renderMarkdown(
      "普通 **粗体** 与 *斜体* 与 `行内代码`",
    );

    expect(container.querySelector("p")?.textContent).toBe(
      "普通 粗体 与 斜体 与 行内代码",
    );
    expect(container.querySelector("strong")?.textContent).toBe("粗体");
    expect(container.querySelector("em")?.textContent).toBe("斜体");
    expect(container.querySelector("code")?.textContent).toBe("行内代码");
  });

  it("无序与有序列表渲染成列表, 保持条目顺序", async () => {
    await renderMarkdown("- 甲\n- 乙\n\n1. 一\n2. 二");

    const [bullets, ordered] = screen.getAllByRole("list");
    const bulletItems = within(bullets).getAllByRole("listitem");
    const orderedItems = within(ordered).getAllByRole("listitem");
    expect(bulletItems.map((item) => item.textContent)).toEqual(["甲", "乙"]);
    expect(orderedItems.map((item) => item.textContent)).toEqual(["一", "二"]);
    expect(ordered.tagName).toBe("OL");
  });

  it("引用块, 分隔线与代码块渲染成对应元素, 代码块保持换行且不高亮", async () => {
    const { container } = await renderMarkdown(
      "> 引用的话\n\n---\n\n```js\nconst a = 1;\nconst b = 2;\n```",
    );

    expect(container.querySelector("blockquote")?.textContent).toContain(
      "引用的话",
    );
    expect(container.querySelector("hr")).not.toBeNull();
    const code = container.querySelector("pre > code");
    expect(code?.textContent).toBe("const a = 1;\nconst b = 2;\n");
    expect(code?.querySelector("span")).toBeNull();
  });
});

describe("MarkdownView GFM 扩展", () => {
  it("表格渲染成带表头与单元格的表格", async () => {
    await renderMarkdown(
      "| 名称 | 值 |\n| --- | --- |\n| 甲 | 1 |\n| 乙 | 2 |",
    );

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const rows = within(table).getAllByRole("row");
    expect(headers.map((cell) => cell.textContent)).toEqual(["名称", "值"]);
    expect(rows).toHaveLength(3);
    expect(within(rows[2]).getAllByRole("cell")[0].textContent).toBe("乙");
  });

  it("任务列表渲染成只读的复选框, 按原文显示勾选状态", async () => {
    await renderMarkdown("- [x] 已完成\n- [ ] 待办");

    const [done, todo] = screen.getAllByRole("checkbox");
    expect(done.getAttribute("aria-checked")).toBe("true");
    expect(todo.getAttribute("aria-checked")).toBe("false");
    expect(done.getAttribute("aria-disabled")).toBe("true");
    expect(todo.getAttribute("aria-disabled")).toBe("true");
  });

  it("删除线渲染成 del 元素", async () => {
    const { container } = await renderMarkdown("~~作废~~");

    expect(container.querySelector("del")?.textContent).toBe("作废");
  });

  it("裸网址自动成为可点的链接, 不是真正的链接元素", async () => {
    const { container } = await renderMarkdown("见 https://example.test/a");

    expect(
      screen.getByRole("button", { name: "https://example.test/a" }),
    ).toBeDefined();
    expect(container.querySelector("a")).toBeNull();
  });

  it("脚注的文字都显示, 脚注的锚点不是可点的链接", async () => {
    await renderMarkdown("正文[^1]\n\n[^1]: 脚注说明");

    expect(screen.getByText(/脚注说明/)).toBeDefined();
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(document.querySelector("a")).toBeNull();
  });
});
