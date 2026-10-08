import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/**
 * 渲染端源码文件: 相对前端根的路径 (正斜杠) 与文本.
 */
export interface RendererSourceFile {
  /**
   * 相对前端根的路径, 使用正斜杠.
   */
  relativePath: string;
  /**
   * 文件文本.
   */
  text: string;
}

/**
 * 前端根目录, 即本文件所在目录的上一级.
 */
const FRONTEND_ROOT = resolve(__dirname, "..");

/**
 * 参与扫描的文件扩展名.
 */
const SCANNED_EXTENSIONS: readonly string[] = [".ts", ".tsx", ".css"];

/**
 * 测试文件的后缀. 测试里会故意写出反例, 不参与扫描.
 */
const TEST_FILE_SUFFIXES: readonly string[] = [".test.ts", ".test.tsx"];

/**
 * 允许写时间字面量的原始值层 token 文件, 相对前端根.
 */
const PRIMITIVES_FILE_PATH = "styles/tokens.primitives.css";

/**
 * 测试支撑目录, 相对前端根, 只被测试文件引用, 不参与扫描.
 */
const TESTING_DIRECTORY_PREFIX = "testing/";

/**
 * 判断一个文件是否参与扫描.
 * @param relativePath 相对前端根的路径, 使用正斜杠.
 * @returns 参与扫描时为 true.
 */
function isScannedFile(relativePath: string): boolean {
  return (
    SCANNED_EXTENSIONS.some((extension) => relativePath.endsWith(extension)) &&
    !TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix)) &&
    !relativePath.startsWith(TESTING_DIRECTORY_PREFIX) &&
    relativePath !== PRIMITIVES_FILE_PATH
  );
}

/**
 * 递归列出目录下全部文件的绝对路径.
 * @param directory 目录的绝对路径.
 * @returns 文件的绝对路径列表.
 */
function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
}

/**
 * 列出渲染端参与扫描的源码文件: 前端根下的脚本与样式, 不含测试文件,
 * 测试支撑目录与原始值层 token 文件.
 * @returns 源码文件列表, 路径使用正斜杠.
 */
export function listRendererSources(): RendererSourceFile[] {
  return listFiles(FRONTEND_ROOT)
    .map((absolutePath) => ({
      absolutePath,
      relativePath: relative(FRONTEND_ROOT, absolutePath).split(sep).join("/"),
    }))
    .filter((file) => isScannedFile(file.relativePath))
    .map((file) => ({
      relativePath: file.relativePath,
      text: readFileSync(file.absolutePath, "utf8"),
    }));
}
