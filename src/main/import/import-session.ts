import type { NotImportedItem } from "@shared/import/import-reasons";

import type { ImportPlan } from "./import-planner";

/**
 * 等待用户确认的导入: 规划结果含明文字段值, 只在主进程内存里短暂停留.
 */
export interface PendingImport {
  /**
   * 规划结果.
   */
  readonly plan: ImportPlan;
  /**
   * 判成重复的条目在规划结果里的序号.
   */
  readonly duplicateIndexes: ReadonlySet<number>;
  /**
   * 来源文件的路径, 路径不进日志也不到渲染端.
   */
  readonly sourcePath: string;
}

/**
 * 导入结束后保留的信息, 只含来源文件的路径与未能带入清单, 不含任何字段的值.
 */
export interface FinishedImport {
  /**
   * 来源文件的路径.
   */
  readonly sourcePath: string;
  /**
   * 未能带入清单.
   */
  readonly notImported: readonly NotImportedItem[];
}

/**
 * 登记一个延时回调.
 * @param callback 到时要执行的回调.
 * @param delayMilliseconds 延时的毫秒数.
 * @returns 取消这个回调的函数.
 */
export type ScheduleExpiry = (
  callback: () => void,
  delayMilliseconds: number,
) => () => void;

/**
 * 基于 `setTimeout` 的延时登记, 定时器不阻止进程退出.
 * @param callback 到时要执行的回调.
 * @param delayMilliseconds 延时的毫秒数.
 * @returns 取消这个回调的函数.
 */
export const scheduleWithTimeout: ScheduleExpiry = (
  callback,
  delayMilliseconds,
) => {
  const handle = setTimeout(callback, delayMilliseconds);
  handle.unref();
  return () => clearTimeout(handle);
};

/**
 * 等待确认的导入最多在内存里保留多久, 单位毫秒, 超过后自动释放, 避免明文长时间停留.
 */
export const IMPORT_SESSION_LIFETIME_MILLISECONDS = 10 * 60 * 1000;

/**
 * 导入会话的依赖.
 */
export interface ImportSessionDependencies {
  /**
   * 等待确认的导入最多保留多久, 单位毫秒, 到时自动释放.
   */
  readonly lifetimeMilliseconds: number;
  /**
   * 登记延时回调.
   */
  readonly scheduleExpiry: ScheduleExpiry;
}

/**
 * 导入会话: 单槽保存等待确认的导入 (含明文), 超时, 取消, 重新选择与导入结束时释放; 导入结束后
 * 另外保留来源文件路径与未能带入清单, 供保存清单与打开所在文件夹使用.
 */
export class ImportSession {
  /**
   * 等待确认的导入.
   */
  private pending: PendingImport | undefined;

  /**
   * 导入结束后保留的信息.
   */
  private finished: FinishedImport | undefined;

  /**
   * 取消等待确认的导入的超时释放.
   */
  private cancelExpiry: (() => void) | undefined;

  /**
   * 创建导入会话.
   * @param dependencies 会话依赖.
   */
  constructor(private readonly dependencies: ImportSessionDependencies) {}

  /**
   * 保存一个等待确认的导入, 替换并释放之前的, 并开始计时.
   * @param pending 等待确认的导入.
   */
  hold(pending: PendingImport): void {
    this.releasePending();
    this.pending = pending;
    this.cancelExpiry = this.dependencies.scheduleExpiry(
      () => this.releasePending(),
      this.dependencies.lifetimeMilliseconds,
    );
  }

  /**
   * 读取等待确认的导入, 不释放它.
   * @returns 等待确认的导入, 没有时为 undefined.
   */
  peekPending(): PendingImport | undefined {
    return this.pending;
  }

  /**
   * 释放等待确认的导入与它的计时.
   */
  releasePending(): void {
    this.cancelExpiry?.();
    this.cancelExpiry = undefined;
    this.pending = undefined;
  }

  /**
   * 保存导入结束后要保留的信息, 替换之前保留的.
   * @param finished 结束后保留的信息.
   */
  retain(finished: FinishedImport): void {
    this.finished = finished;
  }

  /**
   * 读取导入结束后保留的信息.
   * @returns 保留的信息, 没有时为 undefined.
   */
  retained(): FinishedImport | undefined {
    return this.finished;
  }

  /**
   * 释放全部: 等待确认的导入与结束后保留的信息.
   */
  clear(): void {
    this.releasePending();
    this.finished = undefined;
  }
}
