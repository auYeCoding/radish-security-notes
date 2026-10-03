import {
  operationFailed,
  operationSucceeded,
} from "@shared/result/operation-result";
import { describe, expect, it, vi } from "vitest";

import { runWithDatabase, type DatabaseAccess } from "./database-access";
import type { VaultOrm } from "./drizzle-adapter";

/**
 * 测试用的查询入口, 测试里的操作都不会真正使用它.
 */
const FAKE_ORM = {} as VaultOrm;

/**
 * 构造已解锁的数据库依赖.
 * @param onFailure 意外失败的回调.
 * @returns 取得 FAKE_ORM 的数据库依赖.
 */
function unlockedAccess(onFailure: (error: unknown) => void): DatabaseAccess {
  return { getOrm: () => FAKE_ORM, onFailure };
}

describe("runWithDatabase 未解锁与成功", () => {
  it("未解锁时返回 vault-locked, 不执行操作也不通知回调", () => {
    const operation = vi.fn();
    const onFailure = vi.fn();

    const result = runWithDatabase(
      { getOrm: () => undefined, onFailure },
      operation,
    );

    expect(result).toEqual({ ok: false, reason: "vault-locked" });
    expect(operation).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("已解锁时把查询入口交给操作, 成功结果原样返回", () => {
    const operation = vi.fn(() => operationSucceeded("value"));
    const onFailure = vi.fn();

    const result = runWithDatabase(unlockedAccess(onFailure), operation);

    expect(result).toEqual({ ok: true, value: "value" });
    expect(operation).toHaveBeenCalledWith(FAKE_ORM);
    expect(onFailure).not.toHaveBeenCalled();
  });
});

describe("runWithDatabase 失败", () => {
  it("操作返回的业务失败原样返回, 不通知回调", () => {
    const onFailure = vi.fn();

    const result = runWithDatabase(unlockedAccess(onFailure), () =>
      operationFailed("not-found"),
    );

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("操作抛出错误时通知回调并返回 unexpected-error", () => {
    const onFailure = vi.fn();
    const error = new TypeError("底层失败");

    const result = runWithDatabase(unlockedAccess(onFailure), () => {
      throw error;
    });

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(error);
  });

  it("抛出的不是错误对象时也返回 unexpected-error", () => {
    const onFailure = vi.fn();

    const result = runWithDatabase(unlockedAccess(onFailure), () => {
      throw "plain-text";
    });

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(onFailure).toHaveBeenCalledWith("plain-text");
  });
});
