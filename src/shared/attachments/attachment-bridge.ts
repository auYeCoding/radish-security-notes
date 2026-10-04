import type {
  AttachmentAddOutcome,
  AttachmentMeta,
  AttachmentSaveOutcome,
} from "./attachment-types";
import type { AttachmentResult } from "./attachment-result";

/**
 * preload 暴露给渲染进程的附件接口. 附件内容在主进程里读写, 渲染端只拿到元数据; 唯一的例外是
 * 图片预览, 它返回 data: 地址, 只在预览对话框里持有.
 */
export interface AttachmentBridge {
  /**
   * 读取一个条目的全部附件元数据, 按添加顺序排列.
   * @param entryId 条目编号.
   * @returns 附件元数据列表.
   */
  list: (
    entryId: string,
  ) => Promise<AttachmentResult<readonly AttachmentMeta[]>>;
  /**
   * 让主进程弹出选择文件对话框 (可多选) 并把所选文件添加为条目的附件.
   * @param entryId 条目编号.
   * @returns 用户取消, 或已添加的附件元数据; 有文件不合规时整次都不添加.
   */
  addFromDialog: (
    entryId: string,
  ) => Promise<AttachmentResult<AttachmentAddOutcome>>;
  /**
   * 把拖入的文件添加为条目的附件: preload 把文件换成路径, 只有路径交给主进程读取.
   * @param entryId 条目编号.
   * @param files 拖入的文件.
   * @returns 已添加的附件元数据; 有文件不合规时整次都不添加.
   */
  addDropped: (
    entryId: string,
    files: readonly File[],
  ) => Promise<AttachmentResult<AttachmentAddOutcome>>;
  /**
   * 让主进程弹出保存对话框并把附件内容原样写出.
   * @param attachmentId 附件编号.
   * @returns 已保存, 或用户取消.
   */
  saveAs: (
    attachmentId: string,
  ) => Promise<AttachmentResult<AttachmentSaveOutcome>>;
  /**
   * 让主进程把附件解密成只读的临时副本并交给系统默认程序打开, 可执行类附件不能打开.
   * @param attachmentId 附件编号.
   * @returns 打开结果.
   */
  open: (attachmentId: string) => Promise<AttachmentResult<undefined>>;
  /**
   * 读取一个图片附件的预览地址.
   * @param attachmentId 附件编号.
   * @returns data: 地址, 不是可预览的图片或超过预览大小上限时为 not-previewable 的失败结果.
   */
  preview: (attachmentId: string) => Promise<AttachmentResult<string>>;
  /**
   * 删除一个附件, 元数据与内容都从加密数据库里移除.
   * @param attachmentId 附件编号.
   * @returns 删除结果.
   */
  remove: (attachmentId: string) => Promise<AttachmentResult<undefined>>;
}
