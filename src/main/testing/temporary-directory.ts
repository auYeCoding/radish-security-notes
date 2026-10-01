import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach } from "vitest";

/**
 * 创建测试用的临时目录.
 * @param prefix 目录名前缀.
 * @returns 临时目录的绝对路径.
 */
export function createTemporaryDirectory(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `${prefix}-`));
}

/**
 * 删除测试用的临时目录及其内容.
 * @param path 临时目录的绝对路径.
 * @returns 删除完成后兑现.
 */
export function removeTemporaryDirectory(path: string): Promise<void> {
  return rm(path, { recursive: true, force: true });
}

/**
 * 在当前测试分组中登记钩子: 每个测试前创建临时目录, 测试后删除.
 * @param prefix 目录名前缀.
 * @returns 取得当前测试的临时目录路径的函数.
 */
export function useTemporaryDirectory(prefix: string): () => string {
  let current = "";
  beforeEach(async () => {
    current = await createTemporaryDirectory(prefix);
  });
  afterEach(async () => {
    await removeTemporaryDirectory(current);
  });
  return () => current;
}
