import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  EmailBackupMessageKey,
  EmailBackupTranslate,
} from "@shared/email-backup/email-backup-message-keys";
import type { EmailBackupSettingsInput } from "@shared/email-backup/email-backup-settings";
import type { SmtpConnection } from "@shared/email-backup/smtp-connection";

import { BackupFileGenerator } from "../email-backup/backup-file-generator";
import { AutoBackupSettingsService } from "../email-backup/auto-backup-settings-service";
import {
  BackupTemporaryStore,
  NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
} from "../email-backup/backup-temp-store";
import {
  createEmailBackupAuthorization,
  type EmailBackupAuthorization,
} from "../email-backup/email-backup-authorization";
import { EmailBackupLedger } from "../email-backup/email-backup-ledger";
import { createEmailBackupProgressTracker } from "../email-backup/email-backup-progress-tracker";
import { EmailBackupRunner } from "../email-backup/email-backup-runner";
import { EmailBackupService } from "../email-backup/email-backup-service";
import { EmailBackupSettingsService } from "../email-backup/email-backup-settings-service";
import { EmailTestSender } from "../email-backup/email-test-sender";
import type {
  MailSenderPort,
  OutgoingMail,
  SmtpCredentials,
} from "../email-backup/mail-sender-port";
import type { ExportFilePort } from "../export/export-ports";
import { NODE_EXPORT_FILE } from "../export/node-export-file-system";
import { createDefaultExportSerializerRegistry } from "../export/serializers/default-serializer-registry";
import type { DatabaseAccess } from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 测试用的主密码.
 */
export const SAMPLE_MASTER_PASSWORD = "correct horse battery";

/**
 * 测试用的授权码, 测试里搜索日志与返回值时用它确认没有泄露.
 */
export const SAMPLE_AUTHORIZATION_CODE = "abcdefghijklmnop";

/**
 * 测试用的备份口令, 测试里搜索日志与返回值时用它确认没有泄露.
 */
export const SAMPLE_PASSPHRASE = "a long enough passphrase";

/**
 * 测试用的发件邮箱地址.
 */
export const SAMPLE_SENDER_ADDRESS = "alice@qq.com";

/**
 * 测试用的备份临时目录名称.
 */
const TEMPORARY_DIRECTORY_NAME = "email-backup-temp";

/**
 * 测试里固定的当前时刻 (本地时间 2026-10-05 20:30).
 */
const SAMPLE_NOW = new Date(2026, 9, 5, 20, 30);

/**
 * 替身发送能力记下的一封邮件.
 */
export interface RecordedMail {
  /**
   * 交给发送能力的邮件.
   */
  readonly mail: OutgoingMail;
  /**
   * 连接的服务器.
   */
  readonly connection: SmtpConnection;
  /**
   * 登录凭据.
   */
  readonly credentials: SmtpCredentials;
  /**
   * 发送那一刻读到的附件字节, 没有附件时为 undefined.
   */
  readonly attachmentBytes: Buffer | undefined;
}

/**
 * 测试里可以改动的假系统状态.
 */
export interface EmailBackupFixtureState {
  /**
   * 发送时抛出的错误, 没有时发送成功.
   */
  sendError: unknown;
  /**
   * 保险库是否设了主密码.
   */
  hasMasterPassword: boolean;
  /**
   * 每次发送开始时调用, 测试里用来在发送进行中读取进度.
   */
  onSend: (() => void) | undefined;
  /**
   * 假系统时钟的当前时刻, 测试里改它来模拟时间流逝, 不真等.
   */
  now: Date;
}

/**
 * 邮箱备份服务的测试环境.
 */
export interface EmailBackupFixture {
  /**
   * 邮箱备份服务.
   */
  readonly service: EmailBackupService;
  /**
   * 设置服务, 测试里直接用它读写设置.
   */
  readonly settings: EmailBackupSettingsService;
  /**
   * 备份文件生成器, 测试里直接用它生成备份文件.
   */
  readonly generator: BackupFileGenerator;
  /**
   * 假系统状态.
   */
  readonly state: EmailBackupFixtureState;
  /**
   * 替身发送能力记下的全部邮件.
   */
  readonly sent: RecordedMail[];
  /**
   * 失败回调收到的全部错误.
   */
  readonly failures: unknown[];
  /**
   * 备份临时目录的路径.
   */
  readonly temporaryDirectory: string;
}

/**
 * 测试用的文案函数: 返回键加参数的 JSON, 方便断言邮件里写了什么.
 * @param key 文案键.
 * @param parameters 文案参数.
 * @returns 键加参数的文本.
 */
function translateForTest(
  key: EmailBackupMessageKey,
  parameters?: Parameters<EmailBackupTranslate>[1],
): string {
  return parameters === undefined
    ? key
    : `${key} ${JSON.stringify(parameters)}`;
}

/**
 * 创建替身发送能力: 记下邮件与发送那一刻的附件字节, 按状态决定是否抛错.
 * @param sent 记录邮件的列表.
 * @param state 假系统状态.
 * @returns 替身发送能力.
 */
function createRecordingSender(
  sent: RecordedMail[],
  state: EmailBackupFixtureState,
): MailSenderPort {
  return {
    send: async (connection, credentials, mail) => {
      state.onSend?.();
      const attachmentBytes =
        mail.attachment === undefined
          ? undefined
          : await readFile(mail.attachment.filePath);
      sent.push({ mail, connection, credentials, attachmentBytes });
      if (state.sendError !== undefined) {
        throw state.sendError;
      }
    },
  };
}

/**
 * 组装邮箱备份服务需要的外部能力.
 */
interface ServiceWiring {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 身份复核.
   */
  readonly authorization: EmailBackupAuthorization;
  /**
   * 备份文件的写出能力.
   */
  readonly file: ExportFilePort;
  /**
   * 备份临时目录的路径.
   */
  readonly temporaryDirectory: string;
  /**
   * 取假系统时钟的当前时刻.
   */
  readonly now: () => Date;
}

/**
 * 由外部能力与发送能力组装邮箱备份服务, 设置服务与备份文件生成器.
 * @param wiring 外部能力.
 * @param sender 发送能力.
 * @returns 服务, 设置服务与生成器.
 */
function createServiceParts(
  wiring: ServiceWiring,
  sender: MailSenderPort,
): Pick<EmailBackupFixture, "service" | "settings" | "generator"> {
  const { database, authorization, now } = wiring;
  const progress = createEmailBackupProgressTracker();
  const temporaryStore = new BackupTemporaryStore({
    fileSystem: NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
    directory: wiring.temporaryDirectory,
    onFailure: database.onFailure,
  });
  const settings = new EmailBackupSettingsService({ database, authorization });
  const generator = new BackupFileGenerator({
    database,
    serializers: createDefaultExportSerializerRegistry(),
    file: wiring.file,
    temporaryStore,
    tracker: progress.generation,
    translate: (key) => key,
    now,
    yieldToEventLoop: () => Promise.resolve(),
  });
  const runner = new EmailBackupRunner({
    database,
    authorization,
    generator,
    temporaryStore,
    sender,
    progress,
    ledger: new EmailBackupLedger({ database, now }),
    translate: translateForTest,
    now,
  });
  const service = new EmailBackupService({
    database,
    settings,
    runner,
    testSender: new EmailTestSender({
      database,
      sender,
      translate: translateForTest,
    }),
    progress,
    autoBackup: new AutoBackupSettingsService({ database, authorization, now }),
    now,
  });
  return { service, settings, generator };
}

/**
 * 创建邮箱备份服务的测试环境: 真实的加密测试库与备份生成, 不联网的替身发送能力.
 * @param getOrm 取当前测试数据库查询入口的函数, 返回 undefined 模拟未解锁.
 * @param directory 测试用的临时目录.
 * @param file 备份文件的写出能力, 默认是真实的文件系统, 测试里可换成会失败的替身.
 * @returns 测试环境.
 */
export function createEmailBackupFixture(
  getOrm: () => VaultOrm | undefined,
  directory: string,
  file: ExportFilePort = NODE_EXPORT_FILE,
): EmailBackupFixture {
  const state: EmailBackupFixtureState = {
    sendError: undefined,
    hasMasterPassword: false,
    onSend: undefined,
    now: SAMPLE_NOW,
  };
  const sent: RecordedMail[] = [];
  const failures: unknown[] = [];
  const database: DatabaseAccess = {
    getOrm,
    onFailure: (error) => {
      failures.push(error);
    },
  };
  const authorization = createEmailBackupAuthorization({
    hasMasterPassword: () => Promise.resolve(state.hasMasterPassword),
    verify: (password) => Promise.resolve(password === SAMPLE_MASTER_PASSWORD),
  });
  const temporaryDirectory = join(directory, TEMPORARY_DIRECTORY_NAME);
  const parts = createServiceParts(
    { database, authorization, file, temporaryDirectory, now: () => state.now },
    createRecordingSender(sent, state),
  );
  return {
    ...parts,
    state,
    sent,
    failures,
    temporaryDirectory,
  };
}

/**
 * 一个合规的保存设置请求: QQ 邮箱, 带授权码, 口令加密并带口令.
 * @param overrides 要覆盖的字段.
 * @returns 保存设置请求.
 */
export function savedSettingsInput(
  overrides: Partial<EmailBackupSettingsInput> = {},
): EmailBackupSettingsInput {
  return {
    provider: "qq",
    host: "",
    port: 465,
    security: "ssl",
    senderAddress: SAMPLE_SENDER_ADDRESS,
    recipientAddress: "",
    sizeLimitMebibytes: 50,
    isEncrypted: true,
    hasAcknowledgedPlaintextRisk: false,
    authorizationCode: SAMPLE_AUTHORIZATION_CODE,
    passphrase: SAMPLE_PASSPHRASE,
    ...overrides,
  };
}
