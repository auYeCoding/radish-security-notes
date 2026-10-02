import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COPY_FEEDBACK_MILLISECONDS } from "./copy-button";
import { TotpCodeButton } from "./totp-code-button";

/**
 * 渲染验证码按钮.
 * @param onCopy 点击时执行的复制.
 * @param code 验证码, 默认是 6 位.
 */
function renderButton(onCopy: () => Promise<boolean>, code = "123456"): void {
  render(
    <TotpCodeButton
      code={code}
      label="复制 验证码"
      copiedLabel="已复制"
      onCopy={onCopy}
    />,
  );
}

describe("TotpCodeButton 显示", () => {
  it("验证码本身是按钮, 分组显示, 名称带名称与纯数字验证码", () => {
    renderButton(() => Promise.resolve(true));

    const button = screen.getByRole("button", { name: "复制 验证码 123456" });
    expect(button.textContent).toBe("123 456");
  });

  it("8 位验证码分成两个 4 位", () => {
    renderButton(() => Promise.resolve(true), "12345678");

    expect(screen.getByRole("button").textContent).toBe("1234 5678");
  });

  it("没有复制过时不显示已复制", () => {
    renderButton(() => Promise.resolve(true));

    expect(screen.queryByText("已复制")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("TotpCodeButton 复制反馈", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("点击后执行复制, 验证码旁出现已复制并通知读屏软件, 约 2 秒后还原", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCopy = vi.fn(() => Promise.resolve(true));
    renderButton(onCopy);

    await user.click(screen.getByRole("button", { name: /^复制 验证码/ }));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("已复制")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("已复制");
    expect(screen.getByRole("button").textContent).toBe("123 456");
    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MILLISECONDS);
    });
    expect(screen.queryByText("已复制")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("复制失败时不显示已复制", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderButton(() => Promise.resolve(false));

    await user.click(screen.getByRole("button", { name: /^复制 验证码/ }));

    expect(screen.queryByText("已复制")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
