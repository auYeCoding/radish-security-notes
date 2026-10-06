import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupResult,
} from "@shared/email-backup/email-backup-result";
import type {
  EmailBackupSettingsInput,
  EmailBackupSettingsView,
} from "@shared/email-backup/email-backup-settings";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import { afterAuthorizationCodeSaved } from "./auto-backup-backoff";
import { updateExistingSchedule } from "./auto-backup-schedule-repository";
import type { EmailBackupAuthorization } from "./email-backup-authorization";
import {
  findSaveRejection,
  hasNewAuthorizationCode,
  mergeCredentials,
  normalizeSettings,
} from "./email-backup-save-rules";
import {
  readStoredState,
  saveStoredState,
  toSettingsView,
} from "./email-backup-stored-state";

/**
 * 邮箱备份设置服务需要的依赖.
 */
export interface EmailBackupSettingsServiceDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 身份复核.
   */
  readonly authorization: EmailBackupAuthorization;
}

/**
 * 邮箱备份设置服务: 读取设置视图, 保存设置. 授权码与口令只进不出, 视图里只有 "已设置" 标志. 数据库
 * 未解锁时全部操作返回 `vault-locked`.
 */
export class EmailBackupSettingsService {
  /**
   * 创建邮箱备份设置服务.
   * @param dependencies 服务依赖.
   */
  constructor(
    private readonly dependencies: EmailBackupSettingsServiceDependencies,
  ) {}

  /**
   * 读取已保存的设置视图, 没保存过时是默认值.
   * @returns 设置视图, 未解锁时为失败结果.
   */
  async getView(): Promise<EmailBackupResult<EmailBackupSettingsView>> {
    const state = readStoredState(this.dependencies.database);
    if (!state.ok) {
      return state;
    }
    return emailBackupSucceeded(
      toSettingsView(
        state.value,
        await this.dependencies.authorization.requiresMasterPassword(),
      ),
    );
  }

  /**
   * 保存设置: 先做不读主密码的检查, 再校验重输的主密码, 最后在一个事务里写入设置与机密.
   * @param input 保存设置的请求.
   * @returns 保存后的设置视图, 不合规, 主密码错误或未解锁时为失败结果.
   */
  async save(
    input: EmailBackupSettingsInput,
  ): Promise<EmailBackupResult<EmailBackupSettingsView>> {
    const { database, authorization } = this.dependencies;
    const state = readStoredState(database);
    if (!state.ok) {
      return state;
    }
    const settings = normalizeSettings(input);
    const rejection = findSaveRejection(input, settings, state.value);
    if (rejection !== undefined) {
      return emailBackupFailed(rejection);
    }
    if (!(await authorization.isAuthorized(input.masterPassword))) {
      return emailBackupFailed("wrong-master-password");
    }
    const credentials = mergeCredentials(input, settings, state.value);
    const written = runWithDatabase<undefined, EmailBackupFailureReason>(
      database,
      (orm) => {
        saveStoredState(orm, settings, credentials);
        if (hasNewAuthorizationCode(input)) {
          updateExistingSchedule(orm, afterAuthorizationCodeSaved);
        }
        return emailBackupSucceeded(undefined);
      },
    );
    if (!written.ok) {
      return written;
    }
    return emailBackupSucceeded(
      toSettingsView(
        { isSaved: true, settings, credentials },
        await authorization.requiresMasterPassword(),
      ),
    );
  }
}
