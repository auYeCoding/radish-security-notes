import { describe, expect, it, vi } from "vitest";

import { createNonFatalOperationGuard } from "./non-fatal-operation-guard";

describe("不改变保险库状态的操作守卫", () => {
  it("操作成功时原样返回结果", async () => {
    const onFailure = vi.fn();
    const guard = createNonFatalOperationGuard(onFailure);

    const result = await guard.run(() => Promise.resolve({ ok: true }));

    expect(result).toEqual({ ok: true });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("操作抛出意外错误时只通知回调并返回失败结果, 不向外抛", async () => {
    const onFailure = vi.fn();
    const error = new Error("磁盘写入失败");
    const guard = createNonFatalOperationGuard(onFailure);

    const result = await guard.run(() => Promise.reject(error));

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(error);
  });

  it("已有操作在执行时拒绝新的操作, 不执行它", async () => {
    const guard = createNonFatalOperationGuard(vi.fn());
    const second = vi.fn(() => Promise.resolve({ ok: true as const }));

    const [firstResult, secondResult] = await Promise.all([
      guard.run(() => Promise.resolve({ ok: true })),
      guard.run(second),
    ]);

    expect(firstResult).toEqual({ ok: true });
    expect(secondResult).toEqual({ ok: false, reason: "unexpected-state" });
    expect(second).not.toHaveBeenCalled();
  });

  it("操作结束后可以再次执行, 失败之后也一样", async () => {
    const guard = createNonFatalOperationGuard(vi.fn());

    await guard.run(() => Promise.reject(new Error("失败")));
    const result = await guard.run(() => Promise.resolve({ ok: true }));

    expect(result).toEqual({ ok: true });
  });
});
