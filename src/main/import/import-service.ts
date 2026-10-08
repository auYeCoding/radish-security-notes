import { join } from "node:path";

import {
  importFailed,
  importSucceeded,
  type ImportFailureReason,
  type ImportResult,
} from "@shared/import/import-result";
import type { ImportSourceKey } from "@shared/import/import-source-keys";
import type {
  ImportChooseOutcome,
  ImportOutcome,
  ImportProgressSnapshot,
  ImportReportSaveOutcome,
  ImportRunOptions,
} from "@shared/import/import-types";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import { chooseImport, type ImportChooserDependencies } from "./import-chooser";
import type { PlannedEntry } from "./import-planner";
import type {
  ImportDialogPort,
  ImportFilePort,
  ImportReportSinkPort,
  ImportShellPort,
} from "./import-ports";
import {
  createChunkObserver,
  createProgressTracker,
  ImportCancelledError,
} from "./import-progress";
import { buildReportText, type ImportTranslate } from "./import-report-text";
import type { ImportSession, PendingImport } from "./import-session";
import { writeImport, type ImportWriteSummary } from "./import-writer";
import type { SourceRegistry } from "./source-registry";

/**
 * 导入服务的依赖.
 */
export interface ImportServiceDependencies {
  /**
   * 系统对话框.
   */
  readonly dialogs: ImportDialogPort;
  /**
   * 来源文件的文件系统能力.
   */
  readonly file: ImportFilePort;
  /**
   * 未能带入清单写出文件的能力.
   */
  readonly reportSink: ImportReportSinkPort;
  /**
   * 在文件管理器里定位文件的能力.
   */
  readonly shell: ImportShellPort;
  /**
   * 来源适配器的登记表.
   */
  readonly registry: SourceRegistry;
  /**
   * 读写已解锁数据库的能力, 以及意外失败的回调.
   */
  readonly database: DatabaseAccess;
  /**
   * 导入会话.
   */
  readonly session: ImportSession;
  /**
   * 取当前语言文案的函数.
   */
  readonly translate: ImportTranslate;
  /**
   * 选择文件与保存清单的对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
  /**
   * 生成新条目, 文件夹, 标签与自定义字段的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
  /**
   * 让出事件循环.
   */
  readonly yieldToEventLoop: () => Promise<void>;
}

/**
 * 按重复条目的处理方式挑出要写库的条目: 跳过时去掉判成重复的, 仍导入时全部写.
 * @param pending 等待确认的导入.
 * @param options 用户给出的选项.
 * @returns 要写库的条目.
 */
function selectEntries(
  pending: PendingImport,
  options: ImportRunOptions,
): readonly PlannedEntry[] {
  if (options.duplicatePolicy === "import") {
    return pending.plan.entries;
  }
  return pending.plan.entries.filter(
    (_entry, index) => !pending.duplicateIndexes.has(index),
  );
}

/**
 * 导入服务: 编排 "选择文件, 解析, 预览, 确认, 写库, 结果" 的全过程. 来源文件的读取, 解析与写库都在
 * 主进程完成, 渲染端只拿到概要与最终清单. 解析得到的明文只存在导入会话里, 导入完成, 失败, 取消
 * 或超时后释放. 同一时间只处理一次选择或确认, 日志只写错误名.
 */
export class ImportService {
  /**
   * 导入进度的记录器.
   */
  private readonly tracker = createProgressTracker();

  /**
   * 是否正在选择文件或写库.
   */
  private isBusy = false;

  /**
   * 用户是否已要求取消正在进行的选择与解析.
   */
  private isCancelRequested = false;

  /**
   * 创建导入服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: ImportServiceDependencies) {}

  /**
   * 弹出选择文件对话框, 读取并解析所选文件, 把解析结果留在会话里等待确认.
   * @param sourceKey 来源与文件格式的键.
   * @returns 用户取消, 或解析概要; 文件级的问题, 未解锁与意外失败时为失败结果.
   */
  async chooseFile(
    sourceKey: ImportSourceKey,
  ): Promise<ImportResult<ImportChooseOutcome>> {
    if (this.isBusy) {
      return importFailed("busy");
    }
    this.isBusy = true;
    this.isCancelRequested = false;
    this.dependencies.session.clear();
    this.tracker.reset();
    try {
      const chosen = await chooseImport(this.chooserDependencies(), sourceKey);
      if (!chosen.ok) {
        return chosen;
      }
      if (chosen.value.status === "cancelled" || this.isCancelRequested) {
        return importSucceeded({ status: "cancelled" });
      }
      this.dependencies.session.hold(chosen.value.pending);
      return importSucceeded({
        status: "ready",
        preview: chosen.value.preview,
      });
    } catch (error) {
      return this.failureOf(error);
    } finally {
      this.isBusy = false;
      this.tracker.reset();
    }
  }

  /**
   * 确认导入会话里等待确认的解析结果: 按重复条目的处理方式挑出条目, 在一个数据库事务里写库, 写完
   * 或失败后都释放解析结果, 成功时另外保留来源文件路径与未能带入清单.
   * @param options 重复条目的处理方式.
   * @returns 导入概况与未能带入清单; 没有等待确认的导入, 未解锁或数据库出错时为失败结果, 数据库
   * 出错时整个事务回滚, 库里没有任何变化.
   */
  run(options: ImportRunOptions): ImportResult<ImportOutcome> {
    const { session } = this.dependencies;
    const pending = session.peekPending();
    if (this.isBusy) {
      return importFailed("busy");
    }
    if (pending === undefined) {
      return importFailed("no-pending-import");
    }
    this.tracker.begin("writing");
    const entries = selectEntries(pending, options);
    const written = this.write(entries);
    session.releasePending();
    this.tracker.reset();
    if (!written.ok) {
      return written;
    }
    const { notImported } = pending.plan;
    session.retain({ sourcePath: pending.sourcePath, notImported });
    return importSucceeded({
      ...written.value,
      skippedDuplicateCount: pending.plan.entries.length - entries.length,
      skippedEntryCount: pending.plan.skippedEntryCount,
      notImported,
    });
  }

  /**
   * 读取当前导入的进度.
   * @returns 进度快照.
   */
  getProgress(): ImportProgressSnapshot {
    return this.tracker.snapshot();
  }

  /**
   * 判断是否正在选择文件或写库.
   * @returns 进行中为 true.
   */
  hasRunningTask(): boolean {
    return this.isBusy;
  }

  /**
   * 释放等待确认的解析结果 (含明文) 与结束后保留的信息, 保险库锁定时调用.
   */
  discardPending(): void {
    this.dependencies.session.clear();
    this.tracker.reset();
  }

  /**
   * 取消: 正在选择与解析时在下一块处理前中止; 否则释放等待确认的解析结果与保留的信息.
   */
  cancel(): void {
    this.isCancelRequested = true;
    if (!this.isBusy) {
      this.dependencies.session.clear();
      this.tracker.reset();
    }
  }

  /**
   * 弹出保存对话框, 把最近一次导入的未能带入清单写成文本文件.
   * @returns 已保存, 或用户取消; 没有保留的清单或写出失败时为失败结果.
   */
  async saveReport(): Promise<ImportResult<ImportReportSaveOutcome>> {
    const { session, dialogs, translate } = this.dependencies;
    const finished = session.retained();
    if (finished === undefined) {
      return importFailed("no-pending-import");
    }
    const target = await dialogs.showSaveDialog({
      title: translate("import.dialog.saveTitle"),
      defaultPath: join(
        this.dependencies.defaultDirectory,
        translate("import.dialog.reportFileName"),
      ),
    });
    if (target === undefined) {
      return importSucceeded({ status: "cancelled" });
    }
    try {
      const text = buildReportText(finished.notImported, translate);
      await this.dependencies.reportSink.writeTextFile(target, text);
      return importSucceeded({ status: "saved" });
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return importFailed("save-failed");
    }
  }

  /**
   * 在文件管理器里定位最近一次导入的来源文件, 路径不经渲染端.
   * @returns 定位结果; 没有保留的信息或定位失败时为失败结果.
   */
  revealFile(): ImportResult<undefined> {
    const finished = this.dependencies.session.retained();
    if (finished === undefined) {
      return importFailed("no-pending-import");
    }
    try {
      this.dependencies.shell.showItemInFolder(finished.sourcePath);
      return importSucceeded(undefined);
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return importFailed("reveal-failed");
    }
  }

  /**
   * 在已解锁的数据库上用一个事务写入条目.
   * @param entries 要写库的条目.
   * @returns 写入概况, 未解锁或出错时为失败结果.
   */
  private write(
    entries: readonly PlannedEntry[],
  ): ImportResult<ImportWriteSummary> {
    return runWithDatabase<ImportWriteSummary, ImportFailureReason>(
      this.dependencies.database,
      (orm) =>
        importSucceeded(
          writeImport(orm, entries, {
            createIdentifier: this.dependencies.createIdentifier,
            now: this.dependencies.now,
          }),
        ),
    );
  }

  /**
   * 把选择与解析过程中抛出的错误换成结果: 取消是取消结果, 其余只报错误名并返回意外失败.
   * @param error 抛出的错误.
   * @returns 取消的成功结果, 或意外失败的结果.
   */
  private failureOf(error: unknown): ImportResult<ImportChooseOutcome> {
    if (error instanceof ImportCancelledError) {
      return importSucceeded({ status: "cancelled" });
    }
    this.dependencies.database.onFailure(error);
    return importFailed("unexpected-error");
  }

  /**
   * 组装选择与解析需要的依赖.
   * @returns 选择与解析的依赖.
   */
  private chooserDependencies(): ImportChooserDependencies {
    const { dependencies, tracker } = this;
    return {
      dialogs: dependencies.dialogs,
      file: dependencies.file,
      registry: dependencies.registry,
      database: dependencies.database,
      translate: dependencies.translate,
      defaultDirectory: dependencies.defaultDirectory,
      tracker,
      observer: createChunkObserver({
        tracker,
        yieldToEventLoop: dependencies.yieldToEventLoop,
        isCancelled: () => this.isCancelRequested,
      }),
    };
  }
}
