import type { ScheduleExpiry } from "../import/import-session";
import type { ValidatedBackup } from "./restore-backup-types";

/**
 * 等待口令的加密备份最多在内存里保留多久, 单位毫秒; 读出等待确认的备份 (含明文与附件内容)
 * 也是这个时长, 超过后自动释放, 避免明文长时间停留.
 */
export const RESTORE_SESSION_LIFETIME_MILLISECONDS = 10 * 60 * 1000;

/**
 * 已选定文件, 正等用户输入口令的加密备份. 路径只在主进程里, 不进日志也不到渲染端.
 */
export interface SelectedBackup {
  /**
   * 状态, 已选定文件时恒为 selected.
   */
  readonly kind: "selected";
  /**
   * 备份文件的路径.
   */
  readonly filePath: string;
  /**
   * 备份文件的字节数.
   */
  readonly fileSizeBytes: number;
}

/**
 * 已读出并校验通过, 等待用户确认的备份. 内含明文与附件内容, 只在主进程内存里短暂停留.
 */
export interface PendingBackup {
  /**
   * 状态, 等待确认时恒为 pending.
   */
  readonly kind: "pending";
  /**
   * 校验后的备份.
   */
  readonly backup: ValidatedBackup;
  /**
   * 备份文件是否用口令加密.
   */
  readonly isEncrypted: boolean;
}

/**
 * 恢复会话里保留的内容.
 */
export type RestoreSessionContent = SelectedBackup | PendingBackup;

/**
 * 恢复会话的依赖.
 */
export interface RestoreSessionDependencies {
  /**
   * 内容最多保留多久, 单位毫秒, 到时自动释放.
   */
  readonly lifetimeMilliseconds: number;
  /**
   * 登记延时回调.
   */
  readonly scheduleExpiry: ScheduleExpiry;
}

/**
 * 恢复会话: 单槽保存已选定的加密备份, 或等待确认的备份 (含明文), 超时, 取消, 重新选择与恢复
 * 结束时释放.
 */
export class RestoreSession {
  /**
   * 保留的内容.
   */
  private content: RestoreSessionContent | undefined;

  /**
   * 取消超时释放.
   */
  private cancelExpiry: (() => void) | undefined;

  /**
   * 创建恢复会话.
   * @param dependencies 会话依赖.
   */
  constructor(private readonly dependencies: RestoreSessionDependencies) {}

  /**
   * 保存要保留的内容, 替换并释放之前的, 并重新开始计时.
   * @param content 要保留的内容.
   */
  hold(content: RestoreSessionContent): void {
    this.release();
    this.content = content;
    this.cancelExpiry = this.dependencies.scheduleExpiry(
      () => this.release(),
      this.dependencies.lifetimeMilliseconds,
    );
  }

  /**
   * 读取保留的内容, 不释放它.
   * @returns 保留的内容, 没有时为 undefined.
   */
  peek(): RestoreSessionContent | undefined {
    return this.content;
  }

  /**
   * 释放保留的内容与它的计时.
   */
  release(): void {
    this.cancelExpiry?.();
    this.cancelExpiry = undefined;
    this.content = undefined;
  }
}
