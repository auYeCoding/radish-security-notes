import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupResult,
} from "@shared/email-backup/email-backup-result";
import type { ExportTranslateKey } from "@shared/export/export-message-keys";
import type { ExportScope } from "@shared/export/export-request";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { ExportDataset } from "../export/dataset/export-dataset";
import { readExportDataset } from "../export/dataset/export-dataset-reader";
import { failureReasonOf } from "../export/export-failure";
import type { ExportFilePort } from "../export/export-ports";
import type { ExportProgressTracker } from "../export/export-progress";
import { runExportPipeline } from "../export/export-run-pipeline";
import { countExportScope } from "../export/export-scope-counter";
import { createSerializeContext } from "../export/export-serialize-context";
import type { ExportSerializerRegistry } from "../export/serializers/export-serializer-registry";
import { backupFileName } from "./backup-file-name";
import type { BackupTemporaryStore } from "./backup-temp-store";

/**
 * 邮箱备份的范围: 全部条目, 与同一时刻的 "导出全部" 一致.
 */
const ALL_ENTRIES_SCOPE: ExportScope = { kind: "all" };

/**
 * 备份文件生成器的依赖.
 */
export interface BackupFileGeneratorDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 序列化器登记表, 备份用本应用完整格式的序列化器.
   */
  readonly serializers: ExportSerializerRegistry;
  /**
   * 文件系统能力, 原子写出备份文件.
   */
  readonly file: ExportFilePort;
  /**
   * 备份临时目录存储.
   */
  readonly temporaryStore: BackupTemporaryStore;
  /**
   * 进度记录器.
   */
  readonly tracker: ExportProgressTracker;
  /**
   * 取当前语言文案的函数, 序列化时预设字段名用.
   */
  readonly translate: (key: ExportTranslateKey) => string;
  /**
   * 取当前时刻.
   */
  readonly now: () => Date;
  /**
   * 让出事件循环.
   */
  readonly yieldToEventLoop: () => Promise<void>;
}

/**
 * 生成备份文件的请求.
 */
export interface BackupFileRequest {
  /**
   * 备份是否带附件.
   */
  readonly includeAttachments: boolean;
  /**
   * 加密口令, 不加密时没有这一项.
   */
  readonly passphrase: string | undefined;
}

/**
 * 生成好的备份文件.
 */
export interface GeneratedBackupFile {
  /**
   * 临时文件的完整路径, 发完或失败后由调用方删除.
   */
  readonly filePath: string;
  /**
   * 邮件附件上显示的文件名.
   */
  readonly fileName: string;
  /**
   * 文件的字节数.
   */
  readonly fileSizeBytes: number;
  /**
   * 备份里的条目数.
   */
  readonly entryCount: number;
  /**
   * 备份里带的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 备份是否含附件.
   */
  readonly includesAttachments: boolean;
  /**
   * 备份是否用口令加密.
   */
  readonly isEncrypted: boolean;
}

/**
 * 把生成过程中抛出的错误换成失败原因: 附件缺失与文件系统错误各有原因, 其余是意外失败.
 * @param error 抛出的错误.
 * @returns 失败原因.
 */
function toBackupFailureReason(error: unknown): EmailBackupFailureReason {
  const reason = failureReasonOf(error);
  return reason === "attachment-missing" || reason === "write-failed"
    ? reason
    : "unexpected-error";
}

/**
 * 备份文件生成器: 读出全部条目, 复用导出的序列化, 口令加密与原子写入, 生成本应用完整格式版本 1
 * 的一次性文件放在备份临时目录. 读取只经只读事务, 不改动库里任何数据.
 */
export class BackupFileGenerator {
  /**
   * 创建备份文件生成器.
   * @param dependencies 生成器依赖.
   */
  constructor(private readonly dependencies: BackupFileGeneratorDependencies) {}

  /**
   * 生成备份文件. 失败时已经清理了残留的文件.
   * @param request 生成请求.
   * @returns 生成好的文件, 没有条目, 条目过多, 未解锁或写文件失败时为失败结果.
   */
  async generate(
    request: BackupFileRequest,
  ): Promise<EmailBackupResult<GeneratedBackupFile>> {
    const dataset = this.readDataset(request);
    if (!dataset.ok) {
      return dataset;
    }
    try {
      return emailBackupSucceeded(await this.write(request, dataset.value));
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return emailBackupFailed(toBackupFailureReason(error));
    }
  }

  /**
   * 在一个只读事务里读出全部条目的数据集, 先统计条目数, 没有条目或超过上限就不读.
   * @param request 生成请求.
   * @returns 数据集, 未解锁或出错时为失败结果.
   */
  private readDataset(
    request: BackupFileRequest,
  ): EmailBackupResult<ExportDataset> {
    this.dependencies.tracker.begin("preparing");
    return runWithDatabase<ExportDataset, EmailBackupFailureReason>(
      this.dependencies.database,
      (orm) => {
        const { entryCount } = countExportScope(orm, ALL_ENTRIES_SCOPE);
        if (entryCount === 0) {
          return emailBackupFailed("no-entries");
        }
        if (entryCount > MAX_TRANSFER_ENTRIES) {
          return emailBackupFailed("too-many-entries");
        }
        return emailBackupSucceeded(
          readExportDataset(orm, {
            scope: ALL_ENTRIES_SCOPE,
            includeSecrets: true,
            includeAttachments: request.includeAttachments,
          }),
        );
      },
    );
  }

  /**
   * 序列化, 口令加密并原子写到备份临时目录, 报告进度. 失败时删除可能残留的文件.
   * @param request 生成请求.
   * @param dataset 数据集.
   * @returns 生成好的文件; 失败时拒绝.
   */
  private async write(
    request: BackupFileRequest,
    dataset: ExportDataset,
  ): Promise<GeneratedBackupFile> {
    const { dependencies } = this;
    const { tracker, temporaryStore } = dependencies;
    const isEncrypted = request.passphrase !== undefined;
    const fileName = backupFileName(isEncrypted, dependencies.now());
    const filePath = await temporaryStore.prepare(fileName);
    const serializer = dependencies.serializers.require("native");
    const totalSteps = serializer.countSteps(dataset);
    const signal = new AbortController().signal;
    tracker.begin("writing");
    tracker.advance(0, totalSteps);
    try {
      const { payload, fileSizeBytes } = await runExportPipeline({
        dataset,
        serializer,
        context: createSerializeContext({
          createdAt: dependencies.now(),
          getOrm: dependencies.database.getOrm,
          translate: dependencies.translate,
          tracker,
          totalSteps,
          yieldToEventLoop: dependencies.yieldToEventLoop,
          signal,
        }),
        passphrase: request.passphrase,
        file: dependencies.file,
        targetPath: filePath,
        signal,
        onWritten: () => tracker.begin("finishing"),
      });
      return {
        filePath,
        fileName,
        fileSizeBytes,
        entryCount: payload.entryCount,
        attachmentCount: payload.attachmentCount,
        includesAttachments: dataset.includesAttachments,
        isEncrypted,
      };
    } catch (error) {
      await temporaryStore.remove(filePath);
      throw error;
    }
  }
}
