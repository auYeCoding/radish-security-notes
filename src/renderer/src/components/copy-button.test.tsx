import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COPY_FEEDBACK_MILLISECONDS, CopyButton } from "./copy-button";

/**
 * 渲染复制按钮.
 * @param onCopy 点击时执行的复制.
 * @param isDisabled 是否禁用.
 */
function renderButton(
  onCopy: () => Promise<boolean>,
  isDisabled = false,
): void {
  render(
    <CopyButton
      label="复制账号"
      copiedLabel="已复制"
      onCopy={onCopy}
      isDisabled={isDisabled}
    />,
  );
}

describe("CopyButton 复制反馈", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("名称放在无障碍标签里, 默认只有图标没有文字", () => {
    renderButton(() => Promise.resolve(true));

    const button = screen.getByRole("button", { name: "复制账号" });
    expect(button.textContent).toBe("");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("复制成功后按钮就地显示已复制并通知读屏软件, 约 2 秒后还原", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCopy = vi.fn(() => Promise.resolve(true));
    renderButton(onCopy);

    await user.click(screen.getByRole("button", { name: "复制账号" }));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "复制账号" }).textContent).toBe(
      "已复制",
    );
    expect(screen.getByRole("status").textContent).toBe("已复制");
    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MILLISECONDS);
    });
    expect(screen.getByRole("button", { name: "复制账号" }).textContent).toBe(
      "",
    );
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("复制失败时不显示已复制", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderButton(() => Promise.resolve(false));

    await user.click(screen.getByRole("button", { name: "复制账号" }));

    expect(screen.getByRole("button", { name: "复制账号" }).textContent).toBe(
      "",
    );
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("禁用时点击不执行复制", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCopy = vi.fn(() => Promise.resolve(true));
    renderButton(onCopy, true);

    await user.click(screen.getByRole("button", { name: "复制账号" }));

    expect(onCopy).not.toHaveBeenCalled();
  });
});
