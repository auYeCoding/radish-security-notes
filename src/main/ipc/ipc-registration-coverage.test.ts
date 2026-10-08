import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

/**
 * 主进程源码的根目录.
 */
const MAIN_ROOT = resolve(__dirname, "..");

/**
 * 装配文件: 唯一允许接触 Electron 真 `ipcMain` 的生产文件, 它把 `ipcMain` 交给包装函数.
 */
const ASSEMBLY_FILE = "app/start-application.ts";

/**
 * 统一的来源校验包装模块.
 */
const GUARD_MODULE_FILE = "ipc/main-window-guarded-ipc.ts";

/**
 * 测试支撑目录的名字, 不属于生产代码.
 */
const TESTING_DIRECTORY = "testing";

/**
 * 提供真 `ipcMain` 的模块.
 */
const ELECTRON_MODULE = "electron";

/**
 * Electron 导出的主进程 IPC 对象的名字.
 */
const RAW_IPC_EXPORT = "ipcMain";

/**
 * 统一的来源校验包装函数的名字.
 */
const GUARD_FUNCTION = "guardIpcMainByMainWindow";

/**
 * 通道常量表的名字.
 */
const CHANNEL_TABLE = "IPC_CHANNELS";

/**
 * 只由主进程向渲染进程推送的通道, 不是注册的请求应答式通道.
 */
const PUSH_ONLY_CHANNELS: readonly string[] = [
  IPC_CHANNELS.windowMaximizedChanged,
];

/**
 * 一个已解析的生产源文件.
 */
interface ParsedSource {
  /**
   * 相对 `src/main` 的路径, 用正斜杠.
   */
  readonly path: string;
  /**
   * 语法树.
   */
  readonly sourceFile: ts.SourceFile;
}

/**
 * 判断一个文件名是不是生产源码: `.ts` 文件且不是测试文件.
 * @param name 文件名.
 * @returns 是生产源码时为 true.
 */
function isProductionSource(name: string): boolean {
  return name.endsWith(".ts") && !name.endsWith(".test.ts");
}

/**
 * 列出目录下全部生产源文件, 不含测试支撑目录.
 * @param directory 要扫描的目录.
 * @returns 生产源文件的绝对路径.
 */
function listProductionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === TESTING_DIRECTORY
        ? []
        : listProductionSources(path);
    }
    return isProductionSource(entry.name) ? [path] : [];
  });
}

/**
 * 把源码文本解析成带父节点的语法树.
 * @param sourceText 源码文本.
 * @returns 语法树.
 */
function parseSource(sourceText: string): ts.SourceFile {
  return ts.createSourceFile(
    "module.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
}

/**
 * 读出并解析 `src/main` 下的全部生产源文件.
 * @returns 已解析的源文件.
 */
function parseProductionSources(): ParsedSource[] {
  return listProductionSources(MAIN_ROOT).map((file) => ({
    path: relative(MAIN_ROOT, file).split(sep).join("/"),
    sourceFile: parseSource(readFileSync(file, "utf8")),
  }));
}

/**
 * 按相对路径取出一个已解析的源文件.
 * @param sources 已解析的源文件.
 * @param path 相对 `src/main` 的路径.
 * @returns 对应的源文件.
 * @throws Error 当没有这个文件时.
 */
function requireSource(
  sources: readonly ParsedSource[],
  path: string,
): ParsedSource {
  const found = sources.find((source) => source.path === path);
  if (found === undefined) {
    throw new Error(`扫描范围里没有 ${path}`);
  }
  return found;
}

/**
 * 收集语法树里满足条件的全部节点.
 * @param root 起始节点.
 * @param isWanted 节点的判定函数.
 * @returns 满足条件的节点.
 */
function collectNodes<NodeType extends ts.Node>(
  root: ts.Node,
  isWanted: (node: ts.Node) => node is NodeType,
): NodeType[] {
  const found: NodeType[] = [];
  const visit = (node: ts.Node): void => {
    if (isWanted(node)) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

/**
 * 判断节点是不是从 Electron 导入的声明.
 * @param node 语法树节点.
 * @returns 是 `import ... from "electron"` 时为 true.
 */
function isElectronImport(node: ts.Node): node is ts.ImportDeclaration {
  return (
    ts.isImportDeclaration(node) &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text === ELECTRON_MODULE
  );
}

/**
 * 判断节点是不是 `xxx.ipcMain` 形式的成员访问.
 * @param node 语法树节点.
 * @returns 是成员访问时为 true.
 */
function isRawIpcMemberAccess(
  node: ts.Node,
): node is ts.PropertyAccessExpression {
  return (
    ts.isPropertyAccessExpression(node) && node.name.text === RAW_IPC_EXPORT
  );
}

/**
 * 读出一个源文件里绑定了 Electron 真 `ipcMain` 的本地名字, 别名导入也算.
 * @param sourceFile 语法树.
 * @returns 本地名字.
 */
function readRawIpcBindings(sourceFile: ts.SourceFile): string[] {
  return collectNodes(sourceFile, isElectronImport).flatMap((declaration) => {
    const bindings = declaration.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      return [];
    }
    return bindings.elements
      .filter(
        (element) =>
          (element.propertyName ?? element.name).text === RAW_IPC_EXPORT,
      )
      .map((element) => element.name.text);
  });
}

/**
 * 收集对某个名字的引用, 不含导入声明里的名字本身.
 * @param sourceFile 语法树.
 * @param name 要找的名字.
 * @returns 引用该名字的标识符.
 */
function collectReferences(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Identifier[] {
  return collectNodes(
    sourceFile,
    (node): node is ts.Identifier =>
      ts.isIdentifier(node) &&
      node.text === name &&
      !ts.isImportSpecifier(node.parent),
  );
}

/**
 * 判断一个标识符是不是包装函数调用的第一个实参.
 * @param identifier 标识符.
 * @returns 是包装函数的第一个实参时为 true.
 */
function isGuardFirstArgument(identifier: ts.Identifier): boolean {
  const call = identifier.parent;
  return (
    ts.isCallExpression(call) &&
    ts.isIdentifier(call.expression) &&
    call.expression.text === GUARD_FUNCTION &&
    call.arguments[0] === identifier
  );
}

/**
 * 读出一个源文件里用 `IPC_CHANNELS.<键>` 引用的全部通道键.
 * @param sourceFile 语法树.
 * @returns 通道键, 可能重复.
 */
function readChannelKeys(sourceFile: ts.SourceFile): string[] {
  return collectNodes(
    sourceFile,
    (node): node is ts.PropertyAccessExpression =>
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === CHANNEL_TABLE,
  ).map((access) => access.name.text);
}

/**
 * 请求应答式通道的键: 通道常量表去掉只推送的通道.
 */
const REQUEST_CHANNEL_KEYS: readonly string[] = Object.entries(IPC_CHANNELS)
  .filter(([, channel]) => !PUSH_ONLY_CHANNELS.includes(channel))
  .map(([key]) => key);

describe("真 ipcMain 的使用", () => {
  const sources = parseProductionSources();

  it("扫描范围覆盖装配文件与注册文件, 不是空扫描", () => {
    const paths = sources.map((source) => source.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        ASSEMBLY_FILE,
        GUARD_MODULE_FILE,
        "ipc/vault-ipc.ts",
        "ipc/window-controls-ipc.ts",
      ]),
    );
  });

  it("只有装配文件从 electron 导入 ipcMain", () => {
    const importers = sources
      .filter((source) => readRawIpcBindings(source.sourceFile).length > 0)
      .map((source) => source.path);

    expect(importers).toEqual([ASSEMBLY_FILE]);
  });

  it("没有任何生产文件用成员访问取 ipcMain", () => {
    const offenders = sources
      .filter(
        (source) =>
          collectNodes(source.sourceFile, isRawIpcMemberAccess).length > 0,
      )
      .map((source) => source.path);

    expect(offenders).toEqual([]);
  });

  it("装配文件里真 ipcMain 只作为包装函数的第一个实参出现一次", () => {
    const assembly = requireSource(sources, ASSEMBLY_FILE);
    const bindings = readRawIpcBindings(assembly.sourceFile);
    const references = bindings.flatMap((binding) =>
      collectReferences(assembly.sourceFile, binding),
    );

    expect(bindings).toHaveLength(1);
    expect(references).toHaveLength(1);
    expect(references.every(isGuardFirstArgument)).toBe(true);
  });
});

describe("被统一包装覆盖的通道", () => {
  const registered = new Set(
    parseProductionSources()
      .filter((source) => source.path.startsWith("ipc/"))
      .flatMap((source) => readChannelKeys(source.sourceFile)),
  );

  it.each(REQUEST_CHANNEL_KEYS)("%s 由注册文件注册", (key) => {
    expect(registered.has(key)).toBe(true);
  });

  it("注册文件引用的通道都是请求应答式通道, 不含推送通道", () => {
    const unexpected = [...registered].filter(
      (key) => !REQUEST_CHANNEL_KEYS.includes(key),
    );

    expect(unexpected).toEqual([]);
  });
});

describe("扫描器自身", () => {
  it("识别别名导入, 忽略来自其它模块的同名导入", () => {
    const aliased = parseSource('import { ipcMain as raw } from "electron";');
    const foreign = parseSource('import { ipcMain } from "./other";');

    expect(readRawIpcBindings(aliased)).toEqual(["raw"]);
    expect(readRawIpcBindings(foreign)).toEqual([]);
  });

  it("识别 electron.ipcMain 成员访问, 不把形参 ipcMain 当成真对象", () => {
    const memberAccess = parseSource(
      'import * as electron from "electron"; electron.ipcMain.handle("a", f);',
    );
    const parameter = parseSource(
      "export function register(ipcMain: Port): void { ipcMain.handle(a, f); }",
    );

    expect(collectNodes(memberAccess, isRawIpcMemberAccess)).toHaveLength(1);
    expect(readRawIpcBindings(parameter)).toEqual([]);
    expect(collectNodes(parameter, isRawIpcMemberAccess)).toHaveLength(0);
  });

  it("区分包装函数的第一个实参与其它用法", () => {
    const source = parseSource(
      `guardIpcMainByMainWindow(raw, holder); register(raw);`,
    );
    const references = collectReferences(source, "raw");

    expect(references.map(isGuardFirstArgument)).toEqual([true, false]);
  });
});
