import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 仓库根目录.
 */
const REPOSITORY_ROOT = resolve(__dirname, "../../..");

/**
 * 源码根目录.
 */
const SOURCE_ROOT = join(REPOSITORY_ROOT, "src");

/**
 * 必须固定为精确版本的两个原生依赖: 它们是预编译的二进制, 加密实现本身就在里面, 升级要人工核对
 * 发布来源, 不能被范围号悄悄带到新版本.
 */
const PINNED_NATIVE_DEPENDENCIES = [
  "better-sqlite3-multiple-ciphers",
  "@node-rs/argon2",
] as const;

/**
 * 已移除、不能再出现的依赖: 项目的预加载脚本自己经 `contextBridge` 暴露接口, 从未用过它.
 */
const REMOVED_DEPENDENCY = "@electron-toolkit/preload";

/**
 * 精确版本号的写法, 不带范围符号.
 */
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

/**
 * 依赖清单文件里与本测试有关的字段.
 */
interface DependencyManifest {
  /**
   * 运行时依赖的版本范围.
   */
  readonly dependencies: Record<string, string>;
  /**
   * 开发依赖的版本范围.
   */
  readonly devDependencies: Record<string, string>;
}

/**
 * 锁文件里一个包的条目, 根包没有版本号, 只有依赖声明.
 */
interface LockedPackage extends Partial<DependencyManifest> {
  /**
   * 已解析的版本号.
   */
  readonly version?: string;
}

/**
 * 锁文件里与本测试有关的字段.
 */
interface LockFile {
  /**
   * 锁文件里的全部包, 键是包在安装目录里的路径, 空串是根包.
   */
  readonly packages: Record<string, LockedPackage>;
}

/**
 * 读取并解析仓库根目录下的 JSON 文件.
 * @param fileName 文件名.
 * @returns 解析结果.
 */
function readJson<Shape>(fileName: string): Shape {
  return JSON.parse(readFileSync(join(REPOSITORY_ROOT, fileName), "utf8"));
}

/**
 * 列出目录下全部 TypeScript 源文件, 跳过依赖目录与缓存目录.
 * @param directory 起始目录.
 * @returns 源文件的完整路径.
 */
function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : listSourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("package.json 的原生依赖固定为精确版本", () => {
  const manifest = readJson<DependencyManifest>("package.json");
  const lock = readJson<LockFile>("package-lock.json");

  it.each(PINNED_NATIVE_DEPENDENCIES)("%s 在清单里是精确版本", (name) => {
    expect(manifest.dependencies[name]).toMatch(EXACT_VERSION);
  });

  it.each(PINNED_NATIVE_DEPENDENCIES)(
    "%s 在锁文件根包与已解析版本里与清单一致",
    (name) => {
      const pinned = manifest.dependencies[name];

      expect(lock.packages[""].dependencies?.[name]).toBe(pinned);
      expect(lock.packages[`node_modules/${name}`].version).toBe(pinned);
    },
  );
});

describe("已移除的依赖不再出现", () => {
  it("清单与锁文件里都没有", () => {
    const manifest = readJson<DependencyManifest>("package.json");
    const lock = readJson<LockFile>("package-lock.json");

    expect(manifest.dependencies[REMOVED_DEPENDENCY]).toBeUndefined();
    expect(manifest.devDependencies[REMOVED_DEPENDENCY]).toBeUndefined();
    expect(
      lock.packages[""].dependencies?.[REMOVED_DEPENDENCY],
    ).toBeUndefined();
    expect(lock.packages[`node_modules/${REMOVED_DEPENDENCY}`]).toBeUndefined();
  });

  it("源码里没有任何引用", () => {
    const referencing = listSourceFiles(SOURCE_ROOT).filter(
      (file) =>
        file !== __filename &&
        readFileSync(file, "utf8").includes(REMOVED_DEPENDENCY),
    );

    expect(referencing).toEqual([]);
  });
});
