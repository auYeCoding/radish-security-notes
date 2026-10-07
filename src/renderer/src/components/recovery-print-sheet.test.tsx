import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

import { RecoveryPrintSheet } from "./recovery-print-sheet";

/**
 * 渲染打印版式.
 * @returns 打印版式的根元素.
 */
async function renderSheet(): Promise<HTMLElement> {
  const environment = await createVaultTestEnvironment();
  render(<RecoveryPrintSheet words={TEST_RECOVERY_WORDS} />, {
    wrapper: environment.Providers,
  });
  const sheet = document.querySelector("section");
  if (sheet === null) {
    throw new Error("没有渲染出打印版式");
  }
  return sheet;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 2, 9, 30));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RecoveryPrintSheet 内容", () => {
  it("包含标题, 应用名, 生成日期与用法", async () => {
    const sheet = within(await renderSheet());

    expect(
      sheet.getByRole("heading", { name: "恢复密钥", hidden: true }),
    ).toBeDefined();
    expect(sheet.getByText("安全笔记")).toBeDefined();
    expect(sheet.getByText("生成日期: 2026年10月2日")).toBeDefined();
    expect(sheet.getByText(/按序号输入这 24 个词/)).toBeDefined();
  });

  it("包含带序号的 24 个词, 泄露警示与手写留白", async () => {
    const sheet = within(await renderSheet());

    const items = sheet.getAllByRole("listitem", { hidden: true });
    expect(items).toHaveLength(24);
    expect(items[0]?.textContent).toBe("1.abandon");
    expect(items[23]?.textContent).toBe("24.actual");
    expect(sheet.getByText(/等同于万能钥匙/)).toBeDefined();
    expect(sheet.getByText("保管位置")).toBeDefined();
    expect(sheet.getByText("备注")).toBeDefined();
  });
});

describe("RecoveryPrintSheet 只在打印时出现", () => {
  it("平时隐藏, 打印时显示, 并对屏幕阅读器隐藏", async () => {
    const sheet = await renderSheet();

    expect(sheet.className).toContain("hidden");
    expect(sheet.className).toContain("print:flex");
    expect(sheet.getAttribute("aria-hidden")).toBe("true");
  });

  it("页面上没有主密码输入框, 不含任何输入控件", async () => {
    const sheet = await renderSheet();

    expect(sheet.querySelector("input, textarea, button")).toBeNull();
    expect(screen.queryByLabelText("主密码")).toBeNull();
  });
});
