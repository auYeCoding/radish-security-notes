/**
 * 一个附件的元数据. 附件内容不在其中, 渲染端只拿到元数据.
 */
export interface AttachmentMeta {
  /**
   * 附件的唯一编号.
   */
  readonly id: string;
  /**
   * 附件名称, 即添加时的文件名.
   */
  readonly name: string;
  /**
   * 附件内容的字节数.
   */
  readonly size: number;
}

/**
 * 用户在选择文件对话框里取消了, 没有添加任何附件.
 */
export interface AttachmentAddCancelled {
  /**
   * 结果的种类, 取消时恒为 cancelled.
   */
  readonly status: "cancelled";
}

/**
 * 附件已添加.
 */
export interface AttachmentAddAdded {
  /**
   * 结果的种类, 已添加时恒为 added.
   */
  readonly status: "added";
  /**
   * 新增附件的元数据, 按添加顺序排列.
   */
  readonly attachments: readonly AttachmentMeta[];
}

/**
 * 一次添加附件的结果: 用户在选择文件对话框里取消, 或已添加的附件.
 */
export type AttachmentAddOutcome = AttachmentAddCancelled | AttachmentAddAdded;

/**
 * 一次另存为的结果: 用户在保存对话框里取消, 或已写出文件.
 */
export type AttachmentSaveOutcome = "saved" | "cancelled";
