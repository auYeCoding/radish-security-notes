import type { ExportFormatKey } from "./export-format-keys";

/**
 * 导出全部条目的范围.
 */
export interface ExportAllScope {
  /**
   * 范围的种类, 全部条目恒为 all.
   */
  readonly kind: "all";
}

/**
 * 导出指定条目的范围: 渲染端按 "当前列表" 或 "已勾选" 算出条目编号, 主进程据此读取内容.
 */
export interface ExportEntriesScope {
  /**
   * 范围的种类, 指定条目恒为 entries.
   */
  readonly kind: "entries";
  /**
   * 要导出的条目编号, 库里已不存在的编号被忽略.
   */
  readonly entryIds: readonly string[];
}

/**
 * 导出的范围.
 */
export type ExportScope = ExportAllScope | ExportEntriesScope;

/**
 * 导出对话框里用户选的内容选项.
 */
export interface ExportOptions {
  /**
   * 导出格式.
   */
  readonly format: ExportFormatKey;
  /**
   * 是否包含保密字段与 TOTP 密钥.
   */
  readonly includeSecrets: boolean;
  /**
   * 是否包含附件, 只对能带附件的格式有效.
   */
  readonly includeAttachments: boolean;
  /**
   * 加密口令, 不加密时没有这一项.
   */
  readonly passphrase?: string;
}

/**
 * 一次导出请求. 口令与主密码只经进程间通道送到主进程, 不落盘, 不写日志.
 */
export interface ExportRequest extends ExportOptions {
  /**
   * 导出的范围.
   */
  readonly scope: ExportScope;
  /**
   * 用户重新输入的主密码, 保险库没有设主密码时没有这一项.
   */
  readonly masterPassword?: string;
  /**
   * 用户是否已确认明文风险, 不加密导出时必须为真.
   */
  readonly hasAcknowledgedPlaintextRisk: boolean;
}
