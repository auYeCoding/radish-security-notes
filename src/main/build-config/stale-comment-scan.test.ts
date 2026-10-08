import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 主进程源码根目录.
 */
const MAIN_ROOT = resolve(__dirname, "..");

/**
 * 一处曾经过期的注释: 文件, 已经不符合现状的旧说法, 以及改正后必须出现的新说法.
 */
interface StaleComment {
  /**
   * 文件相对主进程源码根目录的路径.
   */
  readonly file: string;
  /**
   * 不再准确的旧说法, 不得再出现.
   */
  readonly stale: string;
  /**
   * 改正后的说法, 必须出现.
   */
  readonly current: string;
}

/**
 * 前几张工单验收时记下的过期注释. 窗口持有者现在服务全部 IPC 通道的来源校验, 明文临时副本在启动,
 * 保险库锁定与应用退出时都会清除.
 */
const STALE_COMMENTS: readonly StaleComment[] = [
  {
    file: "window/main-window-holder.ts",
    stale: "窗口控制的来源校验据此判断",
    current: "全部 IPC 通道的来源校验据此判断",
  },
  {
    file: "app/attachment-runtime.ts",
    stale: "全部明文临时副本, 应用退出时调用",
    current: "保险库锁定与应用退出时调用",
  },
  {
    file: "attachments/temporary-copy-store.ts",
    stale: "应用启动时与退出时",
    current: "应用启动时, 保险库",
  },
  {
    file: "attachments/temporary-copy-store.ts",
    stale: "退出时用它清除本次的副本",
    current: "保险库锁定与应用退出时用它清除",
  },
];

describe("过期注释已改为准确描述", () => {
  it.each(STALE_COMMENTS)(
    "$file 不再有 '$stale'",
    ({ file, stale, current }) => {
      const text = readFileSync(join(MAIN_ROOT, file), "utf8").replace(
        /\s*\r?\n\s*\*\s*/g,
        " ",
      );

      expect(text).not.toContain(stale);
      expect(text).toContain(current);
    },
  );
});
