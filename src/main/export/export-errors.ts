/**
 * 导出被用户取消时抛出的错误, 由服务接住并按取消处理.
 */
export class ExportCancelledError extends Error {
  /**
   * 创建取消错误.
   */
  constructor() {
    super("导出已取消");
    this.name = "ExportCancelledError";
  }
}

/**
 * 写入附件时库里已找不到这个附件的内容 (附件在导出途中被删除) 时抛出的错误, 整次导出失败.
 */
export class ExportAttachmentMissingError extends Error {
  /**
   * 创建附件缺失的错误. 错误信息不含附件名称.
   */
  constructor() {
    super("导出途中附件已不存在");
    this.name = "ExportAttachmentMissingError";
  }
}
