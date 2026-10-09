import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BUILDER_CONFIG_FILE } from "./builder-config-file";

/**
 * 安装包配置块的键名, 取自 electron-builder 的 `nsis` 选项.
 */
const NSIS_BLOCK_KEY = "nsis";

/**
 * 读取打包配置里顶层某个块的内容行: 块标题是顶层键, 块内每行是两个空格缩进; 去掉缩进, 跳过注释行.
 * 不引入 YAML 解析库, 块缺失时读到空数组, 断言随之失败.
 * @param configText 配置文件的全文.
 * @param blockKey 块标题的键名.
 * @returns 块内每一行去掉缩进后的文本.
 */
function readBlockLines(configText: string, blockKey: string): string[] {
  const lines = configText.split(/\r?\n/);
  const start = lines.indexOf(`${blockKey}:`);
  if (start === -1) {
    return [];
  }
  const body = lines.slice(start + 1);
  const end = body.findIndex((line) => /^\S/.test(line));
  const block = end === -1 ? body : body.slice(0, end);
  return block
    .filter((line) => /^ {2}\S/.test(line))
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("#"));
}

describe("electron-builder.yml 的安装包配置", () => {
  const configText = readFileSync(BUILDER_CONFIG_FILE, "utf8");
  const nsisLines = readBlockLines(configText, NSIS_BLOCK_KEY);

  it("不是一键安装, 是向导式安装包", () => {
    expect(nsisLines).toContain("oneClick: false");
  });

  it("允许用户在安装时修改安装路径", () => {
    expect(nsisLines).toContain("allowToChangeInstallationDirectory: true");
  });

  it("读取函数跳过注释行, 对缺失的块返回空数组, 遇到下一个顶层键停止", () => {
    expect(readBlockLines("appId: x\n", NSIS_BLOCK_KEY)).toEqual([]);
    expect(
      readBlockLines(
        `${NSIS_BLOCK_KEY}:\n  # 说明\n  oneClick: false\nmac:\n  other: 1\n`,
        NSIS_BLOCK_KEY,
      ),
    ).toEqual(["oneClick: false"]);
  });
});
