import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import {
  importFailed,
  importSucceeded,
  type ImportFailureReason,
  type ImportResult,
} from "@shared/import/import-result";
import {
  describeImportSource,
  IMPORT_FILE_EXTENSIONS,
  type ImportSourceKey,
} from "@shared/import/import-source-keys";
import type {
  ImportCancelledOutcome,
  ImportPreview,
} from "@shared/import/import-types";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import { readImportText } from "./import-file-reader";
import { planImport, type ImportPlan } from "./import-planner";
import type { ImportDialogPort, ImportFilePort } from "./import-ports";
import { computePreview } from "./import-preview";
import type { ChunkObserver, ImportProgressTracker } from "./import-progress";
import type { ImportTranslate } from "./import-report-text";
import type { PendingImport } from "./import-session";
import { readVaultSnapshot, type VaultSnapshot } from "./import-vault-snapshot";
import type { ImportSourceAdapter } from "./source-adapter";
import type { SourceRegistry } from "./source-registry";

/**
 * 选择并解析来源文件的依赖.
 */
export interface ImportChooserDependencies {
  /**
   * 系统对话框.
   */
  readonly dialogs: ImportDialogPort;
  /**
   * 来源文件的文件系统能力.
   */
  readonly file: ImportFilePort;
  /**
   * 来源适配器的登记表.
   */
  readonly registry: SourceRegistry;
  /**
   * 读取已解锁数据库的能力, 预览要读库里现状.
   */
  readonly database: DatabaseAccess;
  /**
   * 取当前语言文案的函数, 对话框标题与过滤器名称用它.
   */
  readonly translate: ImportTranslate;
  /**
   * 选择文件对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
  /**
   * 进度记录器.
   */
  readonly tracker: ImportProgressTracker;
  /**
   * 分块观察者.
   */
  readonly observer: ChunkObserver;
}

/**
 * 文件已解析并规划好的结果: 给渲染端的预览, 与要留在主进程的待确认导入.
 */
export interface ChosenImportReady {
  /**
   * 结果的状态, 已规划时恒为 ready.
   */
  readonly status: "ready";
  /**
   * 给渲染端的预览.
   */
  readonly preview: ImportPreview;
  /**
   * 要留在主进程内存里的待确认导入.
   */
  readonly pending: PendingImport;
}

/**
 * 选择文件的结果: 用户取消, 或已解析并规划好.
 */
export type ChosenImport = ImportCancelledOutcome | ChosenImportReady;

/**
 * 弹出选择文件对话框.
 * @param dependencies 选择与解析需要的依赖.
 * @param sourceKey 来源与文件格式的键.
 * @returns 用户选定的文件路径, 取消时为 undefined.
 */
function requestSourcePath(
  dependencies: ImportChooserDependencies,
  sourceKey: ImportSourceKey,
): Promise<string | undefined> {
  const { fileKind } = describeImportSource(sourceKey);
  return dependencies.dialogs.showOpenDialog({
    title: dependencies.translate("import.dialog.openTitle"),
    defaultDirectory: dependencies.defaultDirectory,
    filterName: dependencies.translate(`import.dialog.filter.${fileKind}`),
    extensions: IMPORT_FILE_EXTENSIONS[fileKind],
  });
}

/**
 * 读取来源文件并交给适配器解析, 再规划成待写条目.
 * @param dependencies 选择与解析需要的依赖.
 * @param adapter 来源适配器.
 * @param sourcePath 来源文件的路径.
 * @returns 规划结果; 文件级的问题为失败结果.
 */
async function readAndPlan(
  dependencies: ImportChooserDependencies,
  adapter: ImportSourceAdapter,
  sourcePath: string,
): Promise<ImportResult<ImportPlan>> {
  const { tracker, observer } = dependencies;
  tracker.begin("reading");
  const text = await readImportText(
    { file: dependencies.file, onFailure: dependencies.database.onFailure },
    sourcePath,
  );
  if (!text.ok) {
    return text;
  }
  tracker.begin("parsing");
  const parsed = await adapter.parse(text.value, observer);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value.drafts.length > MAX_TRANSFER_ENTRIES) {
    return importFailed("too-many-entries");
  }
  tracker.begin("planning");
  const plan = await planImport(adapter.key, parsed.value, observer);
  return plan.entries.length === 0
    ? importFailed("no-importable-entries")
    : importSucceeded(plan);
}

/**
 * 读库里现状, 未解锁或出错时是失败结果.
 * @param database 读取已解锁数据库的能力.
 * @returns 库里现状的快照.
 */
function loadSnapshot(database: DatabaseAccess): ImportResult<VaultSnapshot> {
  return runWithDatabase<VaultSnapshot, ImportFailureReason>(database, (orm) =>
    importSucceeded(readVaultSnapshot(orm)),
  );
}

/**
 * 弹出选择文件对话框, 读取并解析所选文件, 规划成待写条目并算出预览. 文件级的问题 (读不了, 编码,
 * 格式不符, 条目超限, 没有可导入的条目) 都是失败结果, 此时不留下任何东西.
 * @param dependencies 选择与解析需要的依赖.
 * @param sourceKey 来源与文件格式的键.
 * @returns 取消, 或预览与待确认导入; 失败时为失败结果.
 */
export async function chooseImport(
  dependencies: ImportChooserDependencies,
  sourceKey: ImportSourceKey,
): Promise<ImportResult<ChosenImport>> {
  const adapter = dependencies.registry.find(sourceKey);
  if (adapter === undefined) {
    return importFailed("invalid-input");
  }
  const sourcePath = await requestSourcePath(dependencies, sourceKey);
  if (sourcePath === undefined) {
    return importSucceeded({ status: "cancelled" });
  }
  const planned = await readAndPlan(dependencies, adapter, sourcePath);
  if (!planned.ok) {
    return planned;
  }
  const snapshot = loadSnapshot(dependencies.database);
  if (!snapshot.ok) {
    return snapshot;
  }
  const { preview, duplicateIndexes } = computePreview(
    planned.value,
    snapshot.value,
  );
  return importSucceeded({
    status: "ready",
    preview,
    pending: { plan: planned.value, duplicateIndexes, sourcePath },
  });
}
