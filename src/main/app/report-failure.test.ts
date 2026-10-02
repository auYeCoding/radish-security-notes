import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportFailure } from "./report-failure";

describe("reportFailure", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockReturnValue(undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("错误对象只输出名称与信息, 前缀是功能名", () => {
    reportFailure("保险库", new TypeError("密钥长度不对"));

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "[保险库] 操作失败, TypeError: 密钥长度不对",
    );
  });

  it("不输出错误的底层原因与堆栈", () => {
    const error = new Error("外层失败", { cause: new Error("secret-cause") });

    reportFailure("恢复词", error);

    const printed = String(consoleError.mock.calls[0]?.[0]);
    expect(printed).not.toContain("secret-cause");
    expect(printed).not.toContain("at ");
  });

  it("不是错误对象时输出未知错误, 不输出原值", () => {
    reportFailure("保险库", "secret-value");

    expect(consoleError).toHaveBeenCalledWith("[保险库] 操作失败, 未知错误");
  });
});
