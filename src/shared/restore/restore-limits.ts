import { MAX_ATTACHMENTS_PER_ENTRY } from "../attachments/attachment-limits";
import { MAX_TRANSFER_ENTRIES } from "../data-transfer/transfer-limits";

/**
 * 1 MiB 对应的字节数.
 */
const BYTES_PER_MEBIBYTE = 1024 * 1024;

/**
 * 1 KiB 对应的字节数.
 */
const BYTES_PER_KIBIBYTE = 1024;

/**
 * 清单文件与保险库数据文件, 压缩包里除附件之外必有的文件个数.
 */
const FIXED_ARCHIVE_FILE_COUNT = 2;

/**
 * 恢复时各项读取上限, 防止压缩包炸弹与异常大的文件把主进程内存耗尽.
 */
export interface RestoreLimits {
  /**
   * 备份文件允许的最大字节数, 读取前用文件状态检查, 口令加密的文件解密后的字节数也受它约束.
   */
  readonly maxFileBytes: number;
  /**
   * 压缩包里全部文件声明的未压缩字节数之和的上限.
   */
  readonly maxUncompressedBytes: number;
  /**
   * 保险库数据文件 `vault.json` 声明的未压缩字节数上限, 它要整体解析.
   */
  readonly maxVaultDocumentBytes: number;
  /**
   * 清单文件 `manifest.json` 声明的未压缩字节数上限.
   */
  readonly maxManifestBytes: number;
  /**
   * 压缩包里最多的文件个数, 先看中央目录里的个数再读任何文件.
   */
  readonly maxArchiveFiles: number;
}

/**
 * 恢复时采用的读取上限: 备份文件与未压缩总量都是 256 MiB, 保险库数据文件 128 MiB, 清单 64 KiB,
 * 文件个数是清单加保险库数据文件, 再加每个条目都带满附件时的附件个数. 附件的单个大小,
 * 每条目的个数与总字节数, 条目个数沿用附件与导入导出已有的常量.
 */
export const DEFAULT_RESTORE_LIMITS: RestoreLimits = {
  maxFileBytes: 256 * BYTES_PER_MEBIBYTE,
  maxUncompressedBytes: 256 * BYTES_PER_MEBIBYTE,
  maxVaultDocumentBytes: 128 * BYTES_PER_MEBIBYTE,
  maxManifestBytes: 64 * BYTES_PER_KIBIBYTE,
  maxArchiveFiles:
    FIXED_ARCHIVE_FILE_COUNT + MAX_TRANSFER_ENTRIES * MAX_ATTACHMENTS_PER_ENTRY,
};
