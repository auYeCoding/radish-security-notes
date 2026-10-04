import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EntryTestEnvironmentOptions } from "@renderer/testing/entry-test-environment";
import {
  renderInEntryEnvironment,
  type RenderedInEnvironment,
} from "@renderer/testing/render-in-entry-environment";

import { MarkdownView } from "./markdown-view";

/**
 * 渲染一段带网页链接与邮件链接的 Markdown.
 * @param options 条目环境的选项, 例如覆盖假链接桥的方法.
 * @returns 渲染结果的容器与渲染所用的环境.
 */
function renderLinks(
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedInEnvironment> {
  return renderInEntryEnvironment(
    (environment) => (
      <MarkdownView
        source="[官网](https://example.test/a) 与 [写信](mailto:me@example.test)"
        openExternalLink={environment.linkBridge.openExternal}
      />
    ),
    options,
  );
}

describe("MarkdownView 链接显示", () => {
  it("网页与邮件链接显示成按钮, 悬停提示是完整地址, 页面里没有链接元素", async () => {
    const { container } = await renderLinks();

    const web = screen.getByRole("button", { name: "官网" });
    const mail = screen.getByRole("button", { name: "写信" });
    expect(web.getAttribute("title")).toBe("https://example.test/a");
    expect(mail.getAttribute("title")).toBe("mailto:me@example.test");
    expect(container.querySelector("a")).toBeNull();
  });

  it("点击链接先弹确认框显示完整地址, 此时没有打开", async () => {
    const { environment } = await renderLinks();

    await userEvent.setup().click(screen.getByRole("button", { name: "官网" }));

    const dialog = await screen.findByRole("alertdialog", {
      name: "打开外部链接?",
    });
    expect(dialog.textContent).toContain("https://example.test/a");
    expect(environment.linkBridge.openExternal).not.toHaveBeenCalled();
  });
});

describe("MarkdownView 链接确认", () => {
  it("确认后经链接桥打开该地址, 确认框关闭", async () => {
    const { environment } = await renderLinks();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "写信" }));
    await user.click(await screen.findByRole("button", { name: "打开" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.linkBridge.openExternal).toHaveBeenCalledExactlyOnceWith(
      "mailto:me@example.test",
    );
  });

  it("取消后不打开, 确认框关闭", async () => {
    const { environment } = await renderLinks();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "官网" }));
    await user.click(await screen.findByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.linkBridge.openExternal).not.toHaveBeenCalled();
  });

  it("打开失败时确认框保持打开并提示, 可以取消", async () => {
    await renderLinks({
      linkBridgeOverrides: {
        openExternal: vi.fn(() => Promise.resolve(false)),
      },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "官网" }));
    await user.click(await screen.findByRole("button", { name: "打开" }));

    expect(await screen.findByText(/无法打开这个链接/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("桥抛出错误时同样提示失败, 不抛出到界面外", async () => {
    await renderLinks({
      linkBridgeOverrides: {
        openExternal: vi.fn(() => Promise.reject(new Error("ipc"))),
      },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "官网" }));
    await user.click(await screen.findByRole("button", { name: "打开" }));

    expect(await screen.findByText(/无法打开这个链接/)).toBeDefined();
  });
});
