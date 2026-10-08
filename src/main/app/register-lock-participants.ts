import type { EmailBackupService } from "../email-backup/email-backup-service";
import type { ExportService } from "../export/export-service";
import type { ImportService } from "../import/import-service";
import type { RestoreService } from "../restore/restore-service";
import type { LockRegistry } from "../vault/lock-registry";

/**
 * 参与锁定的业务模块: 锁定前要问它们有没有任务进行中, 锁定时要让它们丢弃内存里的解密状态.
 */
export interface LockParticipants {
  /**
   * 导入服务, 选择文件与解析期间算任务进行中, 锁定时释放等待确认的明文.
   */
  readonly importService: Pick<
    ImportService,
    "hasRunningTask" | "discardPending"
  >;
  /**
   * 导出服务, 导出期间算任务进行中.
   */
  readonly exportService: Pick<ExportService, "hasRunningTask">;
  /**
   * 恢复服务, 选择, 读取与恢复期间算任务进行中, 锁定时释放等待确认的备份.
   */
  readonly restoreService: Pick<
    RestoreService,
    "hasRunningTask" | "discardPending"
  >;
  /**
   * 邮箱备份服务, 测试邮件, 立即备份与自动备份发送期间算任务进行中.
   */
  readonly emailBackupService: Pick<EmailBackupService, "hasRunningTask">;
  /**
   * 暂停自动备份直到保险库再次解锁, 锁定时调用.
   */
  readonly pauseAutoBackupUntilUnlocked: () => void;
  /**
   * 删除附件 "用系统程序打开" 留下的明文临时副本, 锁定时调用. 被外部程序占用而删不掉的文件由其既有
   * 回调处理, 留到退出或下次启动时再清扫.
   */
  readonly discardAttachmentTemporaryCopies: () => void;
}

/**
 * 把参与锁定的业务模块登记进锁定登记处: 四类长任务登记为忙碌探测, 导入与恢复的待确认明文,
 * 自动备份调度与附件明文临时副本登记为锁定时的释放动作. 新增长任务或敏感状态时在这里加一行登记,
 * 不改锁定流程.
 * @param registry 锁定登记处.
 * @param participants 参与锁定的业务模块.
 */
export function registerLockParticipants(
  registry: LockRegistry,
  participants: LockParticipants,
): void {
  registry.addBusyProbe(() => participants.importService.hasRunningTask());
  registry.addBusyProbe(() => participants.exportService.hasRunningTask());
  registry.addBusyProbe(() => participants.restoreService.hasRunningTask());
  registry.addBusyProbe(() => participants.emailBackupService.hasRunningTask());
  registry.addReleaser(() => participants.importService.discardPending());
  registry.addReleaser(() => participants.restoreService.discardPending());
  registry.addReleaser(() => participants.pauseAutoBackupUntilUnlocked());
  registry.addReleaser(() => participants.discardAttachmentTemporaryCopies());
}
