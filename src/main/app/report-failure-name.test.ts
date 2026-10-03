import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportFailureName } from "./report-failure-name";

describe("reportFailureName", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockReturnValue(undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("错误对象只输出名称, 前缀是功能名", () => {
    reportFailureName("条目", new TypeError("secret-message"));

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("[条目] 操作失败, TypeError");
  });

  it("不输出错误信息, 底层原因与堆栈", () => {
    const error = new Error("secret-message", {
      cause: new Error("secret-cause"),
    });

    reportFailureName("标签", error);

    const printed = String(consoleError.mock.calls[0]?.[0]);
    expect(printed).not.toContain("secret-message");
    expect(printed).not.toContain("secret-cause");
    expect(printed).not.toContain("at ");
  });

  it("不是错误对象时输出未知错误, 不输出原值", () => {
    reportFailureName("文件夹", "secret-value");

    expect(consoleError).toHaveBeenCalledWith("[文件夹] 操作失败, 未知错误");
  });
});
