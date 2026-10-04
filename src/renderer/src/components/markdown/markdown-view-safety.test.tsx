import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  renderInEntryEnvironment,
  type RenderedInEnvironment,
} from "@renderer/testing/render-in-entry-environment";

import { MarkdownView } from "./markdown-view";

/**
 * 脚本执行后会设置的标记, 渲染恶意样例后它必须保持未设置.
 */
const PWNED_MARKER = "__markdownPwned";

/**
 * 备注里的恶意样例: 脚本, 事件属性, 危险协议的链接, 各种来源的图片, 内嵌框架与样式表.
 */
const MALICIOUS_SOURCE = [
  `<script>window.${PWNED_MARKER} = 1</script>`,
  `<img src="https://example.invalid/track.png" onerror="window.${PWNED_MARKER} = 1">`,
  `<a href="javascript:window.${PWNED_MARKER}=1" onclick="window.${PWNED_MARKER}=1">HTML 链接</a>`,
  `<iframe src="https://example.invalid/frame"></iframe>`,
  `<link rel="stylesheet" href="https://example.invalid/a.css">`,
  `<style>body { display: none }</style>`,
  `[脚本](javascript:window.${PWNED_MARKER}=1)`,
  "[文件](file:///C:/Windows/win.ini)",
  "[数据](data:text/html,<script>alert(1)</script>)",
  "[自定义协议](ms-msdt:/id)",
  "[相对路径](/relative/path)",
  "[锚点](#top)",
  "![远程图片](https://example.invalid/pixel.png)",
  "![](https://example.invalid/pixel-without-alt.png)",
  "![本地图片](file:///C:/secret.png)",
  "![内嵌图片](data:image/png;base64,AAAA)",
].join("\n\n");

/**
 * 渲染恶意样例.
 * @returns 渲染结果的容器与渲染所用的环境.
 */
function renderMalicious(): Promise<RenderedInEnvironment> {
  return renderInEntryEnvironment((environment) => (
    <MarkdownView
      source={MALICIOUS_SOURCE}
      openExternalLink={environment.linkBridge.openExternal}
    />
  ));
}

/**
 * 页面上不应出现的会执行, 加载或导航的元素的选择器.
 */
const FORBIDDEN_ELEMENTS =
  "script, iframe, object, embed, link, style, form, img, a, base, meta";

describe("MarkdownView 恶意输入不会变成页面元素", () => {
  it("没有脚本, 框架, 样式表, 图片与链接元素, 也没有带地址的属性", async () => {
    const { container } = await renderMalicious();

    expect(container.querySelectorAll(FORBIDDEN_ELEMENTS)).toHaveLength(0);
    expect(container.querySelectorAll("[href], [src], [srcset]")).toHaveLength(
      0,
    );
  });

  it("没有任何事件属性, 脚本没有执行", async () => {
    const { container } = await renderMalicious();

    const attributeNames = Array.from(container.querySelectorAll("*")).flatMap(
      (element) => element.getAttributeNames(),
    );
    expect(attributeNames.filter((name) => name.startsWith("on"))).toEqual([]);
    expect(Reflect.has(window, PWNED_MARKER)).toBe(false);
  });

  it("原始 HTML 当作文本原样显示, 用户能看到自己写的内容", async () => {
    await renderMalicious();

    expect(
      screen.getByText(`<script>window.${PWNED_MARKER} = 1</script>`, {
        exact: false,
      }),
    ).toBeDefined();
    expect(screen.getByText(/<iframe src=/)).toBeDefined();
  });
});

describe("MarkdownView 危险链接与图片", () => {
  it("危险协议, 相对路径与锚点的链接只显示文字, 没有可点的元素", async () => {
    await renderMalicious();

    for (const text of [
      "脚本",
      "文件",
      "数据",
      "自定义协议",
      "相对路径",
      "锚点",
    ]) {
      expect(screen.getByText(text)).toBeDefined();
    }
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.queryAllByRole("link")).toEqual([]);
  });

  it("任何来源的图片都不加载, 只显示替代文字, 没有替代文字时显示图片未加载", async () => {
    await renderMalicious();

    for (const alt of ["远程图片", "本地图片", "内嵌图片"]) {
      expect(screen.getByText(alt)).toBeDefined();
    }
    expect(screen.getAllByText("图片未加载")).toHaveLength(1);
  });
});

describe("MarkdownView 不发网络请求", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("渲染恶意样例不调用 fetch, 不打开外部链接", async () => {
    const { environment } = await renderMalicious();

    expect(fetch).not.toHaveBeenCalled();
    expect(environment.linkBridge.openExternal).not.toHaveBeenCalled();
  });
});
