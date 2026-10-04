import type { AttachmentFailureReason } from "./attachment-result";

/**
 * 单个附件允许的最大字节数.
 */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * 一个条目最多带的附件个数.
 */
export const MAX_ATTACHMENTS_PER_ENTRY = 20;

/**
 * 一个条目的全部附件允许的最大总字节数.
 */
export const MAX_ENTRY_ATTACHMENT_BYTES = 100 * 1024 * 1024;

/**
 * 图片附件允许在应用内预览的最大字节数, 超过的只能取出.
 */
export const MAX_PREVIEW_BYTES = 10 * 1024 * 1024;

/**
 * 一次添加请求里最多接受的文件路径个数, 在进程边界处挡掉异常大的请求; 在个数上限之内的
 * 请求是否合规由服务判定.
 */
export const MAX_PATHS_PER_REQUEST = 1000;

/**
 * 一个待添加的文件的名称与字节数.
 */
export interface AttachmentFileFacts {
  /**
   * 文件名.
   */
  readonly name: string;
  /**
   * 文件的字节数.
   */
  readonly size: number;
}

/**
 * 一个条目上已有附件的用量.
 */
export interface EntryAttachmentUsage {
  /**
   * 已有的附件个数.
   */
  readonly count: number;
  /**
   * 已有附件的总字节数.
   */
  readonly totalBytes: number;
}

/**
 * 单个文件不合规的原因与文件名.
 */
export interface AttachmentFileViolation {
  /**
   * 不合规的原因: 空文件, 或超过单个附件的大小上限.
   */
  readonly reason: Extract<
    AttachmentFailureReason,
    "empty-file" | "file-too-large"
  >;
  /**
   * 不合规的文件名.
   */
  readonly fileName: string;
}

/**
 * 找出第一个不合规的文件: 0 字节, 或超过单个附件的大小上限.
 * @param files 按添加顺序排列的待添加文件.
 * @returns 第一个不合规文件的原因与文件名, 都合规时为 undefined.
 */
export function findFileViolation(
  files: readonly AttachmentFileFacts[],
): AttachmentFileViolation | undefined {
  for (const file of files) {
    if (file.size === 0) {
      return { reason: "empty-file", fileName: file.name };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { reason: "file-too-large", fileName: file.name };
    }
  }
  return undefined;
}

/**
 * 判断条目加上这批文件之后是否超过个数或总大小上限.
 * @param usage 条目上已有附件的用量.
 * @param files 待添加的文件.
 * @returns 超过的上限对应的失败原因, 没有超过时为 undefined.
 */
export function findCapacityViolation(
  usage: EntryAttachmentUsage,
  files: readonly AttachmentFileFacts[],
): "too-many-attachments" | "total-too-large" | undefined {
  if (usage.count + files.length > MAX_ATTACHMENTS_PER_ENTRY) {
    return "too-many-attachments";
  }
  const addedBytes = files.reduce((total, file) => total + file.size, 0);
  if (usage.totalBytes + addedBytes > MAX_ENTRY_ATTACHMENT_BYTES) {
    return "total-too-large";
  }
  return undefined;
}
