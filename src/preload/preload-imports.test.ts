import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * 预加载入口文件.
 */
const PRELOAD_ENTRY = resolve(__dirname, "index.ts");

/**
 * 共享模块的根目录, `@shared/` 别名指向这里.
 */
const SHARED_ROOT = resolve(__dirname, "../shared");

/**
 * 共享模块的别名前缀.
 */
const SHARED_ALIAS_PREFIX = "@shared/";

/**
 * 沙箱预加载脚本里能 `require` 的第三方模块. 沙箱只认 `electron`, `events`, `timers`, `url`,
 * 其它模块会抛 `module not found`, 而 electron-vite 会把 `package.json` 里的依赖外置成运行时
 * `require`, 所以预加载入口及其引入的模块只能依赖 `electron`.
 */
const SANDBOX_REQUIRABLE_PACKAGES: readonly string[] = ["electron"];

/**
 * 判断一条导入声明是不是只引入类型, 这样的导入编译后会被擦除.
 * @param clause 导入声明的导入子句, 没有子句时是 undefined.
 * @returns 整条导入都是类型导入时为 true.
 */
function isTypeOnlyImport(clause: ts.ImportClause | undefined): boolean {
  if (clause === undefined) {
    return false;
  }
  const bindings = clause.namedBindings;
  return (
    clause.isTypeOnly ||
    (clause.name === undefined &&
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.length > 0 &&
      bindings.elements.every((element) => element.isTypeOnly))
  );
}

/**
 * 取出一条语句引入的模块说明符, 只认会留在编译产物里的值导入.
 * @param statement 源文件里的一条顶层语句.
 * @returns 模块说明符, 不是值导入时为空数组.
 */
function readValueSpecifier(statement: ts.Statement): string[] {
  if (
    ts.isImportDeclaration(statement) &&
    !isTypeOnlyImport(statement.importClause) &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return [statement.moduleSpecifier.text];
  }
  if (
    ts.isExportDeclaration(statement) &&
    !statement.isTypeOnly &&
    statement.moduleSpecifier !== undefined &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return [statement.moduleSpecifier.text];
  }
  return [];
}

/**
 * 读出一段源码里全部值导入的模块说明符.
 * @param sourceText 源码文本.
 * @returns 模块说明符列表.
 */
function readValueSpecifiers(sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(
    "module.ts",
    sourceText,
    ts.ScriptTarget.Latest,
  );
  return sourceFile.statements.flatMap(readValueSpecifier);
}

/**
 * 把本项目内的模块说明符解析成源文件路径.
 * @param specifier 相对路径或 `@shared/` 别名的说明符.
 * @param importer 引入它的源文件路径.
 * @returns 源文件的绝对路径.
 * @throws Error 当找不到对应的源文件时.
 */
function resolveLocalModule(specifier: string, importer: string): string {
  const base = specifier.startsWith(SHARED_ALIAS_PREFIX)
    ? resolve(SHARED_ROOT, specifier.slice(SHARED_ALIAS_PREFIX.length))
    : resolve(dirname(importer), specifier);
  const found = [`${base}.ts`, join(base, "index.ts")].find((candidate) =>
    existsSync(candidate),
  );
  if (found === undefined) {
    throw new Error(`找不到模块 ${specifier} (由 ${importer} 引入)`);
  }
  return found;
}

/**
 * 取出第三方模块说明符对应的包名: 带作用域的取前两段, 否则取第一段.
 * @param specifier 第三方模块说明符.
 * @returns 包名.
 */
function readPackageName(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : segments[0];
}

/**
 * 判断说明符是不是本项目内的模块.
 * @param specifier 模块说明符.
 * @returns 相对路径或 `@shared/` 别名时为 true.
 */
function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith(SHARED_ALIAS_PREFIX);
}

/**
 * 预加载入口可达的全部源文件与它们引入的第三方包.
 */
interface PreloadClosure {
  /**
   * 可达的源文件绝对路径.
   */
  readonly files: readonly string[];
  /**
   * 值导入的第三方包名, 已去重.
   */
  readonly packages: readonly string[];
}

/**
 * 从预加载入口出发, 沿本项目内的值导入收集全部可达源文件与第三方包.
 * @returns 可达源文件与第三方包名.
 */
function collectPreloadClosure(): PreloadClosure {
  const files = [PRELOAD_ENTRY];
  const packages = new Set<string>();
  for (const file of files) {
    for (const specifier of readValueSpecifiers(readFileSync(file, "utf8"))) {
      if (!isLocalSpecifier(specifier)) {
        packages.add(readPackageName(specifier));
        continue;
      }
      const resolved = resolveLocalModule(specifier, file);
      if (!files.includes(resolved)) {
        files.push(resolved);
      }
    }
  }
  return { files, packages: [...packages].sort() };
}

describe("预加载在沙箱下的导入", () => {
  const closure = collectPreloadClosure();

  it("入口及其引入的模块只依赖沙箱能 require 的第三方包", () => {
    expect(closure.packages).toEqual(SANDBOX_REQUIRABLE_PACKAGES);
  });

  it("可达范围覆盖入口与桥接模块, 不是空扫描", () => {
    expect(closure.files).toContain(PRELOAD_ENTRY);
    expect(closure.files.length).toBeGreaterThan(10);
  });

  it("可达的源文件里没有 require 与动态 import", () => {
    const offenders = closure.files.filter((file) =>
      /\brequire\s*\(|\bimport\s*\(/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});

describe("值导入的识别", () => {
  it("忽略类型导入, 保留值导入, 副作用导入与转出", () => {
    const sourceText = [
      'import type { A } from "zod";',
      'import { type B, type C } from "yup";',
      'import { d } from "electron";',
      'import "side-effect";',
      'import { e, type F } from "./local";',
      'export * from "./reexport";',
      'export type { G } from "./types";',
    ].join("\n");

    expect(readValueSpecifiers(sourceText)).toEqual([
      "electron",
      "side-effect",
      "./local",
      "./reexport",
    ]);
  });

  it("带作用域的包名取前两段, 子路径取第一段", () => {
    expect(readPackageName("@scope/pkg/sub")).toBe("@scope/pkg");
    expect(readPackageName("pkg/sub/deep")).toBe("pkg");
    expect(readPackageName("electron")).toBe("electron");
  });
});
