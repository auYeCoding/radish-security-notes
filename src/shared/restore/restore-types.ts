/**
 * 恢复所处的阶段.
 */
export type RestoreStage =
  "idle" | "reading" | "decrypting" | "unpacking" | "validating" | "writing";

/**
 * 恢复进度的快照, 渲染端轮询它来显示进度.
 */
export interface RestoreProgressSnapshot {
  /**
   * 当前阶段.
   */
  readonly stage: RestoreStage;
  /**
   * 当前阶段已处理的个数.
   */
  readonly processed: number;
  /**
   * 当前阶段要处理的总数, 总数未知或阶段没有细分进度时为 0.
   */
  readonly total: number;
}

/**
 * 保险库里现有内容的个数, 只含计数.
 */
export interface RestoreVaultState {
  /**
   * 保险库是否为空: 没有条目, 文件夹, 标签, 自定义类型.
   */
  readonly isEmpty: boolean;
  /**
   * 现有条目个数.
   */
  readonly entryCount: number;
  /**
   * 现有附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 现有文件夹个数.
   */
  readonly folderCount: number;
  /**
   * 现有标签个数.
   */
  readonly tagCount: number;
  /**
   * 现有自定义类型个数.
   */
  readonly customTypeCount: number;
}

/**
 * 解析备份文件之后给渲染端看的概要. 只含计数与标志, 不含任何条目的内容.
 */
export interface RestorePreview {
  /**
   * 备份生成的时间, ISO 8601 文本.
   */
  readonly createdAt: string;
  /**
   * 备份文件是否用口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 备份里的条目个数.
   */
  readonly entryCount: number;
  /**
   * 备份里的文件夹个数.
   */
  readonly folderCount: number;
  /**
   * 备份里的标签个数.
   */
  readonly tagCount: number;
  /**
   * 备份里的自定义类型个数.
   */
  readonly customTypeCount: number;
  /**
   * 备份里的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 备份里附件内容的总字节数.
   */
  readonly attachmentBytes: number;
  /**
   * 备份是否含保密字段与 TOTP 密钥.
   */
  readonly includesSecrets: boolean;
  /**
   * 备份是否含附件内容.
   */
  readonly includesAttachments: boolean;
  /**
   * 保险库现在的内容个数, 非空时恢复会先清空它们.
   */
  readonly vault: RestoreVaultState;
  /**
   * 恢复前是否要重新输入主密码: 保险库设了主密码时为 true.
   */
  readonly requiresMasterPassword: boolean;
}

/**
 * 用户取消了选择文件对话框的结果.
 */
export interface RestoreCancelledOutcome {
  /**
   * 结果的状态, 取消时恒为 cancelled.
   */
  readonly status: "cancelled";
}

/**
 * 文件是口令加密的备份, 需要用户输入口令的结果. 只告知文件大小, 不含路径.
 */
export interface RestoreNeedsPassphraseOutcome {
  /**
   * 结果的状态, 需要口令时恒为 needs-passphrase.
   */
  readonly status: "needs-passphrase";
  /**
   * 文件的字节数.
   */
  readonly fileSizeBytes: number;
}

/**
 * 备份已读出并校验通过, 给出预览的结果.
 */
export interface RestoreReadyOutcome {
  /**
   * 结果的状态, 已就绪时恒为 ready.
   */
  readonly status: "ready";
  /**
   * 备份概要.
   */
  readonly preview: RestorePreview;
}

/**
 * 选择文件的结果: 用户取消, 需要口令, 或备份已就绪.
 */
export type RestoreChooseOutcome =
  RestoreCancelledOutcome | RestoreNeedsPassphraseOutcome | RestoreReadyOutcome;

/**
 * 确认恢复时用户给出的请求.
 */
export interface RestoreRunRequest {
  /**
   * 重新输入的主密码, 保险库没设主密码时没有这一项.
   */
  readonly masterPassword?: string;
  /**
   * 用户是否已确认 "清空现有数据后整体替换", 保险库非空时必须为 true.
   */
  readonly acknowledgesReplace: boolean;
}

/**
 * 恢复完成后的概况.
 */
export interface RestoreOutcome {
  /**
   * 恢复的条目个数.
   */
  readonly entryCount: number;
  /**
   * 恢复的文件夹个数.
   */
  readonly folderCount: number;
  /**
   * 恢复的标签个数.
   */
  readonly tagCount: number;
  /**
   * 恢复的自定义类型个数.
   */
  readonly customTypeCount: number;
  /**
   * 恢复的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 是否清空并替换了保险库里原有的数据.
   */
  readonly replacedExistingData: boolean;
}
