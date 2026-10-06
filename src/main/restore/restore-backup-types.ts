import type {
  NativeCustomTypeDocument,
  NativeEntryDocument,
  NativeFolderDocument,
  NativeManifest,
  NativeTagDocument,
} from "../export/serializers/native/native-format-types";

/**
 * `vault.json` 的内容: 文件夹, 标签, 自定义类型与条目, 各部分的类型沿用本应用完整格式的定义.
 */
export interface RestoreVaultDocument {
  /**
   * 文件夹, 先创建的在前.
   */
  readonly folders: readonly NativeFolderDocument[];
  /**
   * 标签, 先创建的在前.
   */
  readonly tags: readonly NativeTagDocument[];
  /**
   * 自定义类型, 先创建的在前.
   */
  readonly customEntryTypes: readonly NativeCustomTypeDocument[];
  /**
   * 条目, 按创建先后升序.
   */
  readonly entries: readonly NativeEntryDocument[];
}

/**
 * 读出并校验通过的备份, 只存在于主进程内存里.
 */
export interface ValidatedBackup {
  /**
   * 清单.
   */
  readonly manifest: NativeManifest;
  /**
   * 保险库数据.
   */
  readonly document: RestoreVaultDocument;
  /**
   * 附件内容, 键是附件编号.
   */
  readonly attachments: ReadonlyMap<string, Buffer>;
  /**
   * 附件内容的总字节数.
   */
  readonly attachmentBytes: number;
}
