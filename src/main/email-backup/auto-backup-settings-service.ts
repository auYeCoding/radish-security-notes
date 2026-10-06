import type {
  AutoBackupSaveRequest,
  AutoBackupStatus,
} from "@shared/email-backup/auto-backup-status";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupResult,
} from "@shared/email-backup/email-backup-result";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import { afterChoiceSaved } from "./auto-backup-backoff";
import { readAutoBackupDecision } from "./auto-backup-decision";
import { DEFAULT_AUTO_BACKUP_SCHEDULE } from "./auto-backup-schedule";
import { readSchedule, writeSchedule } from "./auto-backup-schedule-repository";
import { toAutoBackupStatus } from "./auto-backup-status-view";
import type { EmailBackupAuthorization } from "./email-backup-authorization";
import { findBackupReadinessProblem } from "./email-backup-readiness";
import {
  loadStoredState,
  readStoredState,
  type EmailBackupStoredState,
} from "./email-backup-stored-state";

/**
 * 自动备份设置服务需要的依赖.
 */
export interface AutoBackupSettingsServiceDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 身份复核.
   */
  readonly authorization: EmailBackupAuthorization;
  /**
   * 取当前时刻.
   */
  readonly now: () => Date;
}

/**
 * 自动备份设置服务: 读取自动备份状态, 保存开关与间隔. 开启自动备份要求邮箱设置已能备份, 设了
 * 主密码时还要重新输入主密码, 关闭不需要. 数据库未解锁时全部操作返回 `vault-locked`.
 */
export class AutoBackupSettingsService {
  /**
   * 创建自动备份设置服务.
   * @param dependencies 服务依赖.
   */
  constructor(
    private readonly dependencies: AutoBackupSettingsServiceDependencies,
  ) {}

  /**
   * 读取自动备份状态.
   * @returns 自动备份状态, 未解锁时为失败结果.
   */
  getStatus(): EmailBackupResult<AutoBackupStatus> {
    const { database, now } = this.dependencies;
    return runWithDatabase<AutoBackupStatus, EmailBackupFailureReason>(
      database,
      (orm) =>
        emailBackupSucceeded(
          toAutoBackupStatus(
            readSchedule(orm) ?? DEFAULT_AUTO_BACKUP_SCHEDULE,
            readAutoBackupDecision(orm, now()),
            findBackupReadinessProblem(loadStoredState(orm)),
          ),
        ),
    );
  }

  /**
   * 保存开关与间隔: 开启时先检查邮箱设置已能备份, 再校验重输的主密码, 然后写入; 从关闭到开启时
   * 清掉旧的失败状态.
   * @param request 保存请求.
   * @returns 保存后的自动备份状态, 不满足开启条件, 主密码错误或未解锁时为失败结果.
   */
  async save(
    request: AutoBackupSaveRequest,
  ): Promise<EmailBackupResult<AutoBackupStatus>> {
    const { database } = this.dependencies;
    const state = readStoredState(database);
    if (!state.ok) {
      return state;
    }
    const rejection = request.isEnabled
      ? await this.findEnableRejection(state.value, request)
      : undefined;
    if (rejection !== undefined) {
      return emailBackupFailed(rejection);
    }
    const written = runWithDatabase<undefined, EmailBackupFailureReason>(
      database,
      (orm) => {
        writeSchedule(
          orm,
          afterChoiceSaved(
            readSchedule(orm) ?? DEFAULT_AUTO_BACKUP_SCHEDULE,
            request,
          ),
        );
        return emailBackupSucceeded(undefined);
      },
    );
    return written.ok ? this.getStatus() : written;
  }

  /**
   * 检查能不能开启自动备份: 邮箱设置要能备份, 设了主密码时要给出正确的主密码.
   * @param state 邮箱备份状态.
   * @param request 保存请求.
   * @returns 不能开启时的失败原因, 能开启时为 undefined.
   */
  private async findEnableRejection(
    state: EmailBackupStoredState,
    request: AutoBackupSaveRequest,
  ): Promise<EmailBackupFailureReason | undefined> {
    const problem = findBackupReadinessProblem(state);
    if (problem !== undefined) {
      return problem;
    }
    const isAuthorized = await this.dependencies.authorization.isAuthorized(
      request.masterPassword,
    );
    return isAuthorized ? undefined : "wrong-master-password";
  }
}
