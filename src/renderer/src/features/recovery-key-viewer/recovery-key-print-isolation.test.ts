import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { RECOVERY_PRINT_KIT_ATTRIBUTE } from "./recovery-key-print-portal";

/**
 * 样式目录, 相对本测试文件所在的目录.
 */
const STYLES_DIRECTORY = resolve(__dirname, "../../styles");

/**
 * 读取样式目录下的样式文件原文. 渲染进程的测试把样式导入替换为空串, 所以直接读文件.
 * @param fileName 样式文件名.
 * @returns 样式文件的文本.
 */
function readStyleSheet(fileName: string): string {
  return readFileSync(resolve(STYLES_DIRECTORY, fileName), "utf8");
}

describe("打印恢复套件的隔离样式", () => {
  it("只在打印媒体下生效, 隐藏 body 里不是套件的直接子元素", () => {
    const styles = readStyleSheet("print-recovery-kit.css");
    const printStart = styles.indexOf("@media print");

    expect(printStart).toBeGreaterThanOrEqual(0);
    const printBlock = styles.slice(printStart);
    expect(printBlock).toContain(
      `body:has(> [${RECOVERY_PRINT_KIT_ATTRIBUTE}]) > :not([${RECOVERY_PRINT_KIT_ATTRIBUTE}])`,
    );
    expect(printBlock).toContain("display: none");
  });

  it("隔离规则只写在打印媒体块里, 屏幕显示不受影响", () => {
    const styles = readStyleSheet("print-recovery-kit.css");
    const beforePrint = styles.slice(0, styles.indexOf("@media print"));

    expect(beforePrint).not.toContain("display: none");
    expect(beforePrint).not.toContain(":has(");
  });

  it("全局样式引入了这份打印样式", () => {
    expect(readStyleSheet("globals.css")).toContain(
      '@import "./print-recovery-kit.css";',
    );
  });
});
