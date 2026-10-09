import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BUILDER_CONFIG_FILE } from "./builder-config-file";

/**
 * 熔丝块的键名, 取自 electron-builder 的 `electronFuses` 选项.
 */
const FUSE_BLOCK_KEY = "electronFuses";

/**
 * 打包配置里必须有的熔丝取值: 三个调试入口关闭, 只从 asar 加载并校验完整性.
 */
const EXPECTED_FUSES = {
  runAsNode: false,
  enableNodeCliInspectArguments: false,
  enableNodeOptionsEnvironmentVariable: false,
  onlyLoadAppFromAsar: true,
  enableEmbeddedAsarIntegrityValidation: true,
};

/**
 * 读取打包配置里顶层的某个平铺块: 块标题是顶层键, 块内每行是两个空格缩进的 "键: 布尔".
 * 不引入 YAML 解析库, 块缺失或形状不符时读到空对象, 断言随之失败.
 * @param configText 配置文件的全文.
 * @param blockKey 块标题的键名.
 * @returns 块内的键与布尔值.
 */
function readFlatBooleanBlock(
  configText: string,
  blockKey: string,
): Record<string, boolean> {
  const lines = configText.split(/\r?\n/);
  const start = lines.indexOf(`${blockKey}:`);
  if (start === -1) {
    return {};
  }
  const entries: Array<[string, boolean]> = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^ {2}(\w+): (true|false)\s*$/.exec(line);
    if (match === null) {
      break;
    }
    entries.push([match[1], match[2] === "true"]);
  }
  return Object.fromEntries(entries);
}

/**
 * 判断配置文件的顶层是否有某个键.
 * @param configText 配置文件的全文.
 * @param key 顶层键名.
 * @returns 有这个顶层键时为 true.
 */
function hasTopLevelKey(configText: string, key: string): boolean {
  return new RegExp(`^${key}:`, "m").test(configText);
}

describe("electron-builder.yml 的熔丝配置", () => {
  const configText = readFileSync(BUILDER_CONFIG_FILE, "utf8");

  it("关闭三个调试入口, 打开只从 asar 加载与 asar 完整性校验", () => {
    expect(readFlatBooleanBlock(configText, FUSE_BLOCK_KEY)).toEqual(
      EXPECTED_FUSES,
    );
  });

  it("没有关闭 asar, 也没有关闭 asar 完整性数据的生成", () => {
    expect(hasTopLevelKey(configText, "asar")).toBe(false);
    expect(hasTopLevelKey(configText, "disableAsarIntegrity")).toBe(false);
  });

  it("读取函数对缺失的块与形状不符的行返回空对象或截断", () => {
    expect(readFlatBooleanBlock("appId: x\n", FUSE_BLOCK_KEY)).toEqual({});
    expect(
      readFlatBooleanBlock(
        `${FUSE_BLOCK_KEY}:\n  runAsNode: false\n  broken: maybe\n  onlyLoadAppFromAsar: true\n`,
        FUSE_BLOCK_KEY,
      ),
    ).toEqual({ runAsNode: false });
  });
});
