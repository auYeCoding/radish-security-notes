import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { entrySucceeded } from "@shared/entries/entry-result";
import type { TotpCode } from "@shared/entries/totp-config";

import { failingWith } from "@renderer/testing/fake-totp-bridge";
import { FORUM_ENTRY, MAIL_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 测试里假时钟的起点: 一个周期的开始, 此时一个 30 秒周期的验证码还剩 30 秒.
 */
const PERIOD_START = 1_800_000_000_000;

/**
 * 取一个 30 秒周期的验证码结果.
 * @param code 验证码.
 * @param periodStart 周期开始的时刻, 毫秒时间戳.
 * @param periodSeconds 周期秒数, 默认 30.
 * @returns 带验证码的成功结果.
 */
function codeResult(
  code: string,
  periodStart: number,
  periodSeconds = 30,
): Promise<ReturnType<typeof entrySucceeded<TotpCode>>> {
  return Promise.resolve(
    entrySucceeded({
      code,
      expiresAt: periodStart + periodSeconds * 1000,
      periodSeconds,
    }),
  );
}

/**
 * 在条目环境里选中邮箱条目并渲染详情窗格, 等第一次取码完成.
 * @param options 条目环境的选项.
 * @param id 要选中的条目编号, 默认是带 TOTP 的邮箱条目.
 * @returns 渲染所用的环境.
 */
async function renderPane(
  options: EntryTestEnvironmentOptions = {},
  id = MAIL_ENTRY.id,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [MAIL_ENTRY, FORUM_ENTRY],
    ...options,
  });
  await environment.entryStore.getState().select(id);
  render(<EntryDetailPane />, { wrapper: environment.Providers });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return environment;
}

/**
 * 让假时钟前进, 并让取码的异步结果落地.
 * @param milliseconds 前进的毫秒数.
 */
async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe("详情的验证码行", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: PERIOD_START });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("带 TOTP 的条目在类型字段之后, 自定义字段之前显示验证码与密钥两行", async () => {
    await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("123456", PERIOD_START)),
      },
    });

    const labels = Array.from(document.querySelectorAll("dt")).map(
      (term) => term.textContent,
    );
    expect(labels).toEqual([
      "账号",
      "密码",
      "网址",
      "验证码",
      "TOTP 密钥",
      "备用码",
      "备注",
    ]);
  });

  it("不带 TOTP 的条目没有验证码行, 也不向主进程取码", async () => {
    const { totpBridge } = await renderPane({}, FORUM_ENTRY.id);

    expect(screen.queryByText("验证码")).toBeNull();
    expect(screen.queryByText("TOTP 密钥")).toBeNull();
    expect(totpBridge.getCode).not.toHaveBeenCalled();
  });

  it("按条目编号取码, 分组显示验证码, 显示剩余秒数与进度", async () => {
    const { totpBridge } = await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("123456", PERIOD_START)),
      },
    });

    expect(totpBridge.getCode).toHaveBeenCalledWith("mail");
    expect(
      screen.getByRole("button", { name: "复制 验证码 123456" }).textContent,
    ).toBe("123 456");
    expect(screen.getByText("还剩 30 秒")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
  });
});

describe("详情验证码的倒计时", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: PERIOD_START });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("每秒更新剩余秒数与进度条", async () => {
    await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("123456", PERIOD_START)),
      },
    });

    await advance(5000);

    expect(screen.getByText("还剩 25 秒")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "83.33333333333334",
    );
  });

  it("剩余 10 秒及以下才出现 即将换码 提示", async () => {
    await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("123456", PERIOD_START)),
      },
    });

    await advance(19000);
    expect(screen.getByText("还剩 11 秒")).toBeDefined();
    expect(screen.queryByText("即将换码")).toBeNull();

    await advance(1000);
    expect(screen.getByText("还剩 10 秒")).toBeDefined();
    expect(screen.getByText("即将换码")).toBeDefined();
  });
});

describe("详情验证码的到期换码", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: PERIOD_START });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("到期时再向主进程取下一个验证码并自动换码, 中间不重复取", async () => {
    const getCode = vi
      .fn()
      .mockImplementationOnce(() => codeResult("123456", PERIOD_START))
      .mockImplementationOnce(() => codeResult("654321", PERIOD_START + 30000));
    const { totpBridge } = await renderPane({
      totpBridgeOverrides: { getCode },
    });

    await advance(29000);
    expect(totpBridge.getCode).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /123456/ })).toBeDefined();

    await advance(1500);

    expect(totpBridge.getCode).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "复制 验证码 654321" }).textContent,
    ).toBe("654 321");
    expect(screen.getByText("还剩 30 秒")).toBeDefined();
  });
});

describe("详情验证码的位数, 周期与失败", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: PERIOD_START });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("位数, 周期与主进程给出的一致: 8 位分成 4 位加 4 位, 60 秒周期按 60 秒换算", async () => {
    await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("12345678", PERIOD_START, 60)),
      },
    });

    await advance(30000);

    expect(screen.getByRole("button", { name: /12345678/ }).textContent).toBe(
      "1234 5678",
    );
    expect(screen.getByText("还剩 30 秒")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "50",
    );
  });

  it("取码失败时显示读取失败, 不再重试", async () => {
    const { totpBridge } = await renderPane({
      totpBridgeOverrides: { getCode: failingWith("unexpected-error") },
    });

    await advance(5000);

    expect(screen.getByText("无法读取验证码.")).toBeDefined();
    expect(totpBridge.getCode).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

describe("详情验证码的点击复制", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: PERIOD_START, shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("点击验证码让主进程复制此刻的验证码, 并给出已复制反馈", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { totpBridge } = await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("123456", PERIOD_START)),
      },
    });

    await user.click(screen.getByRole("button", { name: /复制 验证码/ }));

    expect(totpBridge.copyCode).toHaveBeenCalledWith("mail");
    expect((await screen.findAllByText("已复制")).length).toBeGreaterThan(0);
  });

  it("复制失败时不显示已复制", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderPane({
      totpBridgeOverrides: {
        getCode: vi.fn(() => codeResult("123456", PERIOD_START)),
        copyCode: failingWith("not-found"),
      },
    });

    await user.click(screen.getByRole("button", { name: /复制 验证码/ }));

    expect(screen.queryByText("已复制")).toBeNull();
  });
});
