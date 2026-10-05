import type { AttachmentBridge } from "../attachments/attachment-bridge";
import type { BatchBridge } from "../batch/batch-bridge";
import type { CustomEntryTypeBridge } from "../entries/custom-types/custom-entry-type-bridge";
import type { EntryBridge } from "../entries/entry-bridge";
import type { TotpBridge } from "../entries/totp-bridge";
import type { FolderBridge } from "../folders/folder-bridge";
import type { ImportBridge } from "../import/import-bridge";
import type { LinkBridge } from "../links/link-bridge";
import type { PreferencesBridge } from "../preferences/preferences-bridge";
import type { TagBridge } from "../tags/tag-bridge";
import type { RecoveryBridge } from "../vault/recovery-bridge";
import type { VaultBridge } from "../vault/vault-bridge";

/**
 * preload 经 `contextBridge` 暴露在 `window.api` 上的全部接口.
 */
export interface RendererApi {
  /**
   * 偏好读写接口.
   */
  readonly preferences: PreferencesBridge;
  /**
   * 保险库接口: 查询启动状态, 设置主密码, 跳过, 解锁.
   */
  readonly vault: VaultBridge;
  /**
   * 恢复接口: 校验恢复词, 凭词恢复保险库, 保存恢复词文本文件.
   */
  readonly recovery: RecoveryBridge;
  /**
   * 条目接口: 读取列表与详情, 新建, 更新与删除条目, 复制字段.
   */
  readonly entries: EntryBridge;
  /**
   * 自定义条目类型接口: 读取与新建自定义类型.
   */
  readonly entryTypes: CustomEntryTypeBridge;
  /**
   * 文件夹接口: 读取, 新建, 重命名与删除文件夹, 把条目放进文件夹.
   */
  readonly folders: FolderBridge;
  /**
   * 标签接口: 读取, 新建, 编辑与删除标签.
   */
  readonly tags: TagBridge;
  /**
   * 批量接口: 一次删除, 移入文件夹, 加标签或摘标签多个条目.
   */
  readonly batch: BatchBridge;
  /**
   * TOTP 接口: 读取验证码与密钥, 复制验证码与密钥, 解码二维码图片.
   */
  readonly totp: TotpBridge;
  /**
   * 附件接口: 读取元数据, 添加, 另存为, 打开, 预览与删除附件.
   */
  readonly attachments: AttachmentBridge;
  /**
   * 导入接口: 选择其他管理器的导出文件, 看解析概要, 确认导入, 取得未能带入清单.
   */
  readonly importer: ImportBridge;
  /**
   * 链接接口: 请主进程用系统默认程序打开外部链接.
   */
  readonly links: LinkBridge;
}
