import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePolledValue } from "./use-polled-value";

/**
 * 轮询间隔, 单位毫秒.
 */
const INTERVAL = 100;

describe("usePolledValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("不处理时不轮询, 返回 undefined", () => {
    const read = vi.fn(() => Promise.resolve(1));
    const { result } = renderHook(() => usePolledValue(false, read, INTERVAL));
    expect(result.current).toBeUndefined();
    expect(read).not.toHaveBeenCalled();
  });

  it("处理期间立即读一次, 之后按间隔轮询并返回最新值", async () => {
    let count = 0;
    const read = vi.fn(() => Promise.resolve((count += 1)));
    const { result } = renderHook(() => usePolledValue(true, read, INTERVAL));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL));
    expect(result.current).toBe(2);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("处理结束后停止轮询并丢弃读到的值", async () => {
    const read = vi.fn(() => Promise.resolve(1));
    const { result, rerender } = renderHook(
      ({ isActive }) => usePolledValue(isActive, read, INTERVAL),
      { initialProps: { isActive: true } },
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBe(1);

    rerender({ isActive: false });
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL * 3));

    expect(result.current).toBeUndefined();
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("usePolledValue 读取被拒绝", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("某次读取被拒绝时不抛出, 值保持, 下一次轮询恢复", async () => {
    const read = vi
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error("ipc down"))
      .mockResolvedValue(3);
    const { result } = renderHook(() => usePolledValue(true, read, INTERVAL));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL));
    expect(result.current).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL));

    expect(result.current).toBe(3);
  });
});
