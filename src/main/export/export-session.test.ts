import { describe, expect, it } from "vitest";

import { createExportSession } from "./export-session";

describe("导出会话", () => {
  it("初始没有路径, 记住后能读到, 清除后忘掉", () => {
    const session = createExportSession();
    expect(session.lastPath()).toBeUndefined();
    session.remember("C:/a/b.zip");
    expect(session.lastPath()).toBe("C:/a/b.zip");
    session.remember("C:/a/c.zip");
    expect(session.lastPath()).toBe("C:/a/c.zip");
    session.clear();
    expect(session.lastPath()).toBeUndefined();
  });
});
