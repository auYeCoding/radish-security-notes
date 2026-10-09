import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BUILDER_CONFIG_FILE } from "../build-config/builder-config-file";
import { APP_USER_MODEL_ID } from "./app-identity";

/**
 * 读取打包配置里顶层的 `appId`.
 * @param configText 配置文件的全文.
 * @returns `appId` 的取值, 没有这一行时为 undefined.
 */
function readAppId(configText: string): string | undefined {
  return /^appId: (\S+)\s*$/m.exec(configText)?.[1];
}

describe("应用标识", () => {
  it("窗口的用户模型标识与打包配置的 appId 相同", () => {
    const configText = readFileSync(BUILDER_CONFIG_FILE, "utf8");

    expect(readAppId(configText)).toBe(APP_USER_MODEL_ID);
  });

  it("不是模板留下的占位值", () => {
    expect(APP_USER_MODEL_ID).not.toMatch(/^com\.electron(\.app)?$/);
  });

  it("读取函数在没有 appId 行时返回 undefined", () => {
    expect(readAppId("productName: x\n")).toBeUndefined();
  });
});
