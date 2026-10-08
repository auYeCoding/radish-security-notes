import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { detachPromise } from "./detach-promise";

/**
 * 等一轮宏任务, 让浏览器与 Node 有机会报告未处理的拒绝.
 * @returns 一轮宏任务之后兑现.
 */
function waitForMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("detachPromise", () => {
  const unhandled = vi.fn();

  beforeEach(() => {
    unhandled.mockReset();
    process.on("unhandledRejection", unhandled);
  });

  afterEach(() => {
    process.off("unhandledRejection", unhandled);
  });

  it("被拒绝的承诺不产生未处理的拒绝", async () => {
    detachPromise(Promise.reject(new Error("ipc down")));

    await waitForMacrotask();

    expect(unhandled).not.toHaveBeenCalled();
  });

  it("成功的承诺照常完成, 调用本身立即返回 undefined", async () => {
    const work = vi.fn(() => Promise.resolve("done"));

    const returned = detachPromise(work());
    await waitForMacrotask();

    expect(returned).toBeUndefined();
    expect(work).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("不改变承诺本身: 其它调用方仍能读到拒绝原因", async () => {
    const failure = new Error("ipc down");
    const promise = Promise.reject(failure);

    detachPromise(promise);

    await expect(promise).rejects.toBe(failure);
  });
});
