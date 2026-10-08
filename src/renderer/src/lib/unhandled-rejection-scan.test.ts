import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 渲染端源码根目录.
 */
const RENDERER_ROOT = resolve(__dirname, "..");

/**
 * 不扫描的目录名: 依赖目录, 缓存目录与测试支撑目录.
 */
const SKIPPED_DIRECTORIES = ["node_modules", "testing"];

/**
 * 丢弃桥调用结果的写法, 不得出现: 桥被拒绝时会产生未处理的拒绝, 要改用 `detachPromise`.
 * 前两个抓直接丢弃的桥调用 (后面接 `.then` 的链由另一条规则检查拒绝处理) 与偏好 store 的修改
 * 动作, 后一个抓丢弃轮询函数.
 */
const DISCARDED_CALL_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ["void bridge.xxx()", /\bvoid\s+bridge\.\w+\([^()]*\)(?=\s*[;,)}\n])/],
  ["void setXxx()", /\bvoid\s+set[A-Z]\w*\(/],
  ["void poll()", /\bvoid\s+poll\(/],
];

/**
 * 列出目录下全部非测试的 TypeScript 源文件.
 * @param directory 起始目录.
 * @returns 源文件的完整路径.
 */
function listProductionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.includes(entry.name)
        ? []
        : listProductionFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

/**
 * 找到与开括号配对的闭括号.
 * @param text 源码全文.
 * @param openIndex 开括号的位置.
 * @returns 闭括号的位置, 括号不配对时为 -1.
 */
function findClosingParenthesis(text: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    depth += text[index] === "(" ? 1 : 0;
    depth -= text[index] === ")" ? 1 : 0;
    if (depth === 0) {
      return index;
    }
  }
  return -1;
}

/**
 * 判断一次调用的括号内是否有第二个实参, 即最外层有逗号.
 * @param text 源码全文.
 * @param openIndex 开括号的位置.
 * @param closeIndex 闭括号的位置.
 * @returns 有第二个实参时为 true.
 */
function hasSecondArgument(
  text: string,
  openIndex: number,
  closeIndex: number,
): boolean {
  let depth = 0;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    depth += "([{".includes(text[index]) ? 1 : 0;
    depth -= ")]}".includes(text[index]) ? 1 : 0;
    if (text[index] === "," && depth === 0) {
      return true;
    }
  }
  return false;
}

/**
 * 找出源码里没有拒绝处理的 `.then(` 调用: 既没有第二个实参, 后面也没有紧跟 `.catch(`.
 * @param text 源码全文.
 * @returns 这些调用所在的行号, 从 1 起.
 */
function findThenWithoutRejectionHandler(text: string): number[] {
  const lines: number[] = [];
  for (const match of text.matchAll(/\.then\(/g)) {
    const openIndex = match.index + match[0].length - 1;
    const closeIndex = findClosingParenthesis(text, openIndex);
    const isHandled =
      hasSecondArgument(text, openIndex, closeIndex) ||
      /^\s*\.catch\(/.test(text.slice(closeIndex + 1));
    if (!isHandled) {
      lines.push(text.slice(0, openIndex).split("\n").length);
    }
  }
  return lines;
}

describe("渲染端源码不产生未处理的拒绝", () => {
  const files = listProductionFiles(RENDERER_ROOT).map((path) => ({
    name: relative(RENDERER_ROOT, path).replaceAll("\\", "/"),
    text: readFileSync(path, "utf8"),
  }));

  it("扫描到了足够多的源文件", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(DISCARDED_CALL_PATTERNS)("没有 %s 这类丢弃写法", (_name, pattern) => {
    expect(files.filter((file) => pattern.test(file.text))).toEqual([]);
  });

  it("每个 .then( 都带拒绝处理", () => {
    const unhandled = files.flatMap((file) =>
      findThenWithoutRejectionHandler(file.text).map(
        (line) => `${file.name}:${line}`,
      ),
    );

    expect(unhandled).toEqual([]);
  });

  it("检测函数能认出缺少拒绝处理的 .then(", () => {
    expect(findThenWithoutRejectionHandler("a.then((x) => f(x));")).toEqual([
      1,
    ]);
    expect(findThenWithoutRejectionHandler("a.then(f, g);")).toEqual([]);
    expect(
      findThenWithoutRejectionHandler("a.then((x) => f(x))\n.catch(h);"),
    ).toEqual([]);
    expect(
      findThenWithoutRejectionHandler("a.then((x, y) => f(x, y));"),
    ).toEqual([1]);
  });
});
