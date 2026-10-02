import { join } from "node:path";

import type { RecoveryTextFileStatus } from "@shared/vault/recovery-bridge";
import { normalizeRecoveryWord } from "@shared/vault/recovery-words";

import { recoveryWordsToDataKey } from "../vault/recovery-phrase";
import { formatLocalIsoDate } from "./local-iso-date";
import { buildRecoveryTextFile } from "./recovery-text-file-content";
import type { RecoveryTextFileLabels } from "./recovery-text-file-labels";
import {
  RECOVERY_TEXT_FILE_EXTENSION,
  buildRecoveryTextFileName,
} from "./recovery-text-file-name";

/**
 * 弹出系统保存对话框所需的信息.
 */
export interface SaveDialogRequest {
  /**
   * 对话框里预填的完整路径.
   */
  readonly defaultPath: string;
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 文件类型过滤器里的名称.
   */
  readonly fileTypeName: string;
  /**
   * 文件类型过滤器里的扩展名, 不含点.
   */
  readonly extension: string;
}

/**
 * 文本文件保存依赖的系统能力: 保存对话框与写文件. 经接口注入, 测试里不弹真实的对话框.
 */
export interface RecoveryTextFilePort {
  /**
   * 弹出系统保存对话框让用户选位置.
   * @param request 对话框的预填信息.
   * @returns 用户选定的路径, 取消时为 undefined.
   */
  readonly showSaveDialog: (
    request: SaveDialogRequest,
  ) => Promise<string | undefined>;
  /**
   * 把文本写成文件.
   * @param filePath 文件路径.
   * @param content 文件内容.
   * @returns 写入完成后兑现.
   */
  readonly writeTextFile: (filePath: string, content: string) => Promise<void>;
}

/**
 * 恢复词文本文件保存器的依赖.
 */
export interface RecoveryTextFileSaverDependencies {
  /**
   * 保存对话框与写文件的系统能力.
   */
  readonly port: RecoveryTextFilePort;
  /**
   * 保存对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
  /**
   * 读取当前时间, 用于文件名与生成日期.
   */
  readonly now: () => Date;
  /**
   * 按当前界面语言读取文案.
   */
  readonly readLabels: (generatedDate: string) => RecoveryTextFileLabels;
  /**
   * 写文件失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 把恢复词保存为明文文本文件: 先校验词是一组合法的恢复词, 再让用户在系统保存对话框里选位置.
 * 只在用户主动点击保存时才写文件, 词不进入日志.
 */
export class RecoveryTextFileSaver {
  /**
   * 创建保存器.
   * @param dependencies 保存器依赖.
   */
  constructor(
    private readonly dependencies: RecoveryTextFileSaverDependencies,
  ) {}

  /**
   * 保存恢复词文本文件.
   * @param words 24 个恢复词.
   * @returns 已保存, 用户取消, 或写入失败.
   * @throws RecoveryWordCountError 当词数不是 24 时.
   * @throws RecoveryUnknownWordError 当某个词不在词表时.
   * @throws RecoveryChecksumError 当校验和不通过时.
   */
  async save(words: readonly string[]): Promise<RecoveryTextFileStatus> {
    recoveryWordsToDataKey(words).fill(0);
    const generatedDate = formatLocalIsoDate(this.dependencies.now());
    const labels = this.dependencies.readLabels(generatedDate);
    const filePath = await this.dependencies.port.showSaveDialog({
      defaultPath: join(
        this.dependencies.defaultDirectory,
        buildRecoveryTextFileName(generatedDate),
      ),
      title: labels.dialogTitle,
      fileTypeName: labels.fileTypeName,
      extension: RECOVERY_TEXT_FILE_EXTENSION,
    });
    if (filePath === undefined) {
      return "cancelled";
    }
    const content = buildRecoveryTextFile({
      words: words.map(normalizeRecoveryWord),
      labels,
    });
    return this.write(filePath, content);
  }

  /**
   * 写文件, 失败时通知回调并返回失败.
   * @param filePath 文件路径.
   * @param content 文件内容.
   * @returns 已保存或写入失败.
   */
  private async write(
    filePath: string,
    content: string,
  ): Promise<RecoveryTextFileStatus> {
    try {
      await this.dependencies.port.writeTextFile(filePath, content);
    } catch (error) {
      this.dependencies.onFailure(error);
      return "failed";
    }
    return "saved";
  }
}
