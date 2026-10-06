import type { RestoreLimits } from "@shared/restore/restore-limits";
import type { RestoreMessageKey } from "@shared/restore/restore-message-keys";
import {
  restoreFailed,
  restoreSucceeded,
  type RestoreFailure,
  type RestoreFailureReason,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type {
  RestoreChooseOutcome,
  RestoreOutcome,
  RestoreProgressSnapshot,
  RestoreReadyOutcome,
  RestoreRunRequest,
  RestoreVaultState,
} from "@shared/restore/restore-types";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { MasterPasswordVerifier } from "../vault/master-password-verifier";
import type { ValidatedBackup } from "./restore-backup-types";
import { WrongPassphraseError, failureOfRestoreError } from "./restore-errors";
import { inspectBackupFile } from "./restore-file-inspector";
import {
  readEncryptedBackup,
  readPlainBackup,
  type RestoreIntakeDependencies,
} from "./restore-intake";
import { isRestoreAuthorized } from "./restore-authorization";
import type { RestoreDialogPort, RestoreFilePort } from "./restore-ports";
import { buildRestorePreview } from "./restore-preview-builder";
import { createRestoreProgressTracker } from "./restore-progress";
import type { RestoreSession } from "./restore-session";
import { writeRestore } from "./restore-writer";
import { readVaultState } from "./vault-content-counter";

/**
 * 选择备份文件对话框接受的扩展名, 不含点号.
 */
const BACKUP_FILE_EXTENSIONS: readonly string[] = ["zip", "age"];

/**
 * 恢复服务的依赖.
 */
export interface RestoreServiceDependencies {
  /**
   * 系统对话框.
   */
  readonly dialogs: RestoreDialogPort;
  /**
   * 备份文件的文件系统能力.
   */
  readonly file: RestoreFilePort;
  /**
   * 读写已解锁数据库的能力, 以及意外失败的回调.
   */
  readonly database: DatabaseAccess;
  /**
   * 主密码校验器.
   */
  readonly verifier: MasterPasswordVerifier;
  /**
   * 恢复会话.
   */
  readonly session: RestoreSession;
  /**
   * 取当前语言文案的函数.
   */
  readonly translate: (key: RestoreMessageKey) => string;
  /**
   * 选择文件对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
  /**
   * 读取上限.
   */
  readonly limits: RestoreLimits;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
}

/**
 * 恢复服务: 编排 "选择文件, 输入口令, 读取解密解包校验, 预览, 确认, 单事务写库, 结果" 的全过程.
 * 文件的读取, 解密, 解包, 校验与写库都在主进程完成, 渲染端只拿到概要与结果摘要. 读出的备份
 * (含明文与附件内容) 只存在恢复会话里, 恢复完成, 取消, 重选或超时后释放. 同一时间只处理一次
 * 选择, 口令提交或恢复; 口令只在一次调用里使用, 不保存, 日志只写错误名.
 */
export class RestoreService {
  /**
   * 恢复进度的记录器.
   */
  private readonly tracker = createRestoreProgressTracker();

  /**
   * 是否正在选择, 读取或恢复.
   */
  private isBusy = false;

  /**
   * 用户是否已要求取消正在进行的选择与读取.
   */
  private isCancelRequested = false;

  /**
   * 创建恢复服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: RestoreServiceDependencies) {}

  /**
   * 弹出选择文件对话框, 检查所选文件: 明文备份直接读出并校验, 口令加密的备份先把文件留在会话里
   * 等用户输入口令.
   * @returns 用户取消, 需要口令, 或备份已就绪; 文件读不了, 太大, 不是备份文件, 内容不合规,
   * 未解锁与意外失败时为失败结果.
   */
  async chooseFile(): Promise<RestoreResult<RestoreChooseOutcome>> {
    if (this.isBusy) {
      return restoreFailed("busy");
    }
    this.isBusy = true;
    this.isCancelRequested = false;
    this.dependencies.session.release();
    this.tracker.reset();
    try {
      return await this.chooseAndRead();
    } catch (error) {
      return this.failureOf(error);
    } finally {
      this.isBusy = false;
      this.tracker.reset();
    }
  }

  /**
   * 用口令解开已选的加密备份, 读出并校验, 把结果留在会话里等待确认. 口令不对时保留所选文件,
   * 可以重试; 其它失败都释放所选文件.
   * @param passphrase 备份的加密口令.
   * @returns 备份已就绪; 没有已选的加密备份, 口令不对, 文件损坏, 内容不合规, 未解锁与意外失败
   * 时为失败结果.
   */
  async submitPassphrase(
    passphrase: string,
  ): Promise<RestoreResult<RestoreReadyOutcome>> {
    const selected = this.dependencies.session.peek();
    if (this.isBusy) {
      return restoreFailed("busy");
    }
    if (selected?.kind !== "selected") {
      return restoreFailed("no-pending-restore");
    }
    this.isBusy = true;
    this.isCancelRequested = false;
    this.tracker.reset();
    try {
      const read = await readEncryptedBackup(
        selected.filePath,
        passphrase,
        this.intakeDependencies(),
      );
      if (!read.ok) {
        this.dependencies.session.release();
        return read;
      }
      return await this.prepareReady(read.value, true);
    } catch (error) {
      if (!(error instanceof WrongPassphraseError)) {
        this.dependencies.session.release();
      }
      return this.failureOf(error);
    } finally {
      this.isBusy = false;
      this.tracker.reset();
    }
  }

  /**
   * 确认恢复会话里等待确认的备份: 先复核主密码, 再在一个数据库事务里判空, 清空 (需已确认替换)
   * 与写入. 恢复成功或数据库出错后释放备份; 主密码不对, 没确认替换时保留, 用户可以改正后重试.
   * @param request 主密码与替换确认.
   * @returns 恢复概况; 没有等待确认的备份, 主密码不对, 保险库非空却未确认替换, 未解锁或数据库
   * 出错时为失败结果, 数据库出错时整个事务回滚, 库里没有任何变化.
   */
  async run(
    request: RestoreRunRequest,
  ): Promise<RestoreResult<RestoreOutcome>> {
    const pending = this.dependencies.session.peek();
    if (this.isBusy) {
      return restoreFailed("busy");
    }
    if (pending?.kind !== "pending") {
      return restoreFailed("no-pending-restore");
    }
    this.isBusy = true;
    try {
      const { database, verifier, session } = this.dependencies;
      if (!(await isRestoreAuthorized(verifier, request.masterPassword))) {
        return restoreFailed("wrong-master-password");
      }
      this.tracker.begin("writing");
      const written = runWithDatabase<RestoreOutcome, RestoreFailureReason>(
        database,
        (orm) =>
          writeRestore(
            orm,
            {
              backup: pending.backup,
              acknowledgesReplace: request.acknowledgesReplace,
            },
            { now: this.dependencies.now },
          ),
      );
      if (written.ok || written.reason === "unexpected-error") {
        session.release();
      }
      return written;
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return restoreFailed("unexpected-error");
    } finally {
      this.isBusy = false;
      this.tracker.reset();
    }
  }

  /**
   * 读取当前恢复的进度.
   * @returns 进度快照.
   */
  getProgress(): RestoreProgressSnapshot {
    return this.tracker.snapshot();
  }

  /**
   * 取消: 正在选择或读取时让结果作废; 没有进行中的操作时释放会话里的内容.
   */
  cancel(): void {
    this.isCancelRequested = true;
    if (!this.isBusy) {
      this.dependencies.session.release();
      this.tracker.reset();
    }
  }

  /**
   * 弹出对话框, 检查所选文件并按种类处理.
   * @returns 选择文件的结果.
   */
  private async chooseAndRead(): Promise<RestoreResult<RestoreChooseOutcome>> {
    const { dialogs, translate, defaultDirectory, file, limits, session } =
      this.dependencies;
    const filePath = await dialogs.showOpenDialog({
      title: translate("restore.dialog.openTitle"),
      defaultDirectory,
      filterName: translate("restore.dialog.filter"),
      extensions: BACKUP_FILE_EXTENSIONS,
    });
    if (filePath === undefined || this.isCancelRequested) {
      return restoreSucceeded({ status: "cancelled" });
    }
    this.tracker.begin("reading");
    const inspected = await inspectBackupFile(filePath, file, limits);
    if (!inspected.ok) {
      return inspected;
    }
    if (inspected.value.kind === "encrypted") {
      const { fileSizeBytes } = inspected.value;
      session.hold({ kind: "selected", filePath, fileSizeBytes });
      return restoreSucceeded({ status: "needs-passphrase", fileSizeBytes });
    }
    const read = await readPlainBackup(filePath, this.intakeDependencies());
    if (!read.ok) {
      return read;
    }
    return this.prepareReady(read.value, false);
  }

  /**
   * 读出保险库现状与主密码要求, 把校验后的备份留在会话里等待确认, 给出预览. 用户已取消时不保留.
   * @param backup 校验后的备份.
   * @param isEncrypted 备份文件是否用口令加密.
   * @returns 备份已就绪的结果; 未解锁时为失败结果, 用户已取消时为取消的成功结果.
   */
  private async prepareReady(
    backup: ValidatedBackup,
    isEncrypted: boolean,
  ): Promise<RestoreResult<RestoreReadyOutcome>> {
    const { database, verifier, session } = this.dependencies;
    const vault = runWithDatabase<RestoreVaultState, RestoreFailureReason>(
      database,
      (orm) => restoreSucceeded(readVaultState(orm)),
    );
    if (!vault.ok) {
      return vault;
    }
    if (this.isCancelRequested) {
      session.release();
      return restoreFailed("no-pending-restore");
    }
    const requiresMasterPassword = await verifier.hasMasterPassword();
    session.hold({ kind: "pending", backup, isEncrypted });
    return restoreSucceeded({
      status: "ready",
      preview: buildRestorePreview(backup, {
        isEncrypted,
        vault: vault.value,
        requiresMasterPassword,
      }),
    });
  }

  /**
   * 把读取过程中抛出的错误换成失败结果: 已知的读取错误换成对应原因, 其余只报错误名并返回
   * 意外失败.
   * @param error 抛出的错误.
   * @returns 失败结果.
   */
  private failureOf(error: unknown): RestoreFailure {
    const known = failureOfRestoreError(error);
    if (known !== undefined) {
      return known;
    }
    this.dependencies.database.onFailure(error);
    return restoreFailed("unexpected-error");
  }

  /**
   * 组装读出备份需要的依赖.
   * @returns 读出备份的依赖.
   */
  private intakeDependencies(): RestoreIntakeDependencies {
    const { file, limits } = this.dependencies;
    return { file, limits, tracker: this.tracker };
  }
}
