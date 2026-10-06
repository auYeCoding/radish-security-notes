import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach } from "vitest";

import {
  DEFAULT_RESTORE_LIMITS,
  type RestoreLimits,
} from "@shared/restore/restore-limits";
import type { RestoreStage } from "@shared/restore/restore-types";

import { encryptExportStream } from "../export/export-encryption";
import { NODE_RESTORE_FILE } from "../restore/node-restore-file-system";
import type { RestoreFilePort } from "../restore/restore-ports";
import { RestoreService } from "../restore/restore-service";
import {
  RESTORE_SESSION_LIFETIME_MILLISECONDS,
  RestoreSession,
} from "../restore/restore-session";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  openVaultDatabase,
  type VaultDatabase,
} from "../vault/database/open-vault-database";
import type { MasterPasswordVerifier } from "../vault/master-password-verifier";
import {
  createEmailBackupFixture,
  SAMPLE_MASTER_PASSWORD,
  SAMPLE_PASSPHRASE,
} from "./email-backup-fixture";
import { seedExportSample } from "./export-sample-data";
import { MIGRATIONS_FOLDER } from "./migrations-folder";
import { useTemporaryDirectory } from "./temporary-directory";
import { useVaultDatabase } from "./use-vault-database";

/**
 * 测试用的备份口令, 与邮箱备份测试用的口令相同.
 */
export const SAMPLE_BACKUP_PASSPHRASE = SAMPLE_PASSPHRASE;

/**
 * 测试用的主密码, 与邮箱备份测试用的主密码相同.
 */
export const SAMPLE_RESTORE_MASTER_PASSWORD = SAMPLE_MASTER_PASSWORD;

/**
 * 测试里固定的当前时刻, 毫秒时间戳.
 */
export const RESTORE_NOW = 1_700_000_000_000;

/**
 * 测试里可以改动的假系统状态.
 */
export interface RestoreFixtureState {
  /**
   * 选择文件对话框返回的路径, undefined 表示用户取消.
   */
  chosenPath: string | undefined;
  /**
   * 保险库是否设了主密码.
   */
  hasMasterPassword: boolean;
  /**
   * 主密码校验器判断是否设了主密码之前要等待的门, 没有时不等待. 测试里用它让一次恢复停在复核
   * 主密码的环节, 再发起第二次操作来验证忙碌状态.
   */
  verifierGate: Promise<void> | undefined;
}

/**
 * 恢复服务的测试环境.
 */
export interface RestoreFixture {
  /**
   * 恢复服务.
   */
  readonly service: RestoreService;
  /**
   * 恢复会话.
   */
  readonly session: RestoreSession;
  /**
   * 假系统状态.
   */
  readonly state: RestoreFixtureState;
  /**
   * 失败回调收到的全部错误.
   */
  readonly failures: unknown[];
  /**
   * 对话框收到的全部请求.
   */
  readonly dialogRequests: unknown[];
  /**
   * 让登记过的超时释放回调到时执行, 测试里用它模拟时间流逝.
   */
  readonly expireSession: () => void;
}

/**
 * 创建恢复服务的测试环境选项.
 */
export interface RestoreFixtureOptions {
  /**
   * 读取上限, 默认是正式的上限, 测试里调低来造超限, 不必造巨型文件.
   */
  readonly limits?: RestoreLimits;
  /**
   * 文件系统能力, 默认是真实的文件系统.
   */
  readonly file?: RestoreFilePort;
  /**
   * 读取当前时间的函数, 默认固定为 `RESTORE_NOW`. 写库时会调用它, 测试里借它在写库过程中观察进度.
   */
  readonly now?: () => number;
}

/**
 * 创建会话: 超时回调只登记在列表里, 由测试决定何时触发.
 * @param expiries 登记超时回调的列表.
 * @returns 恢复会话.
 */
function createManualSession(expiries: (() => void)[]): RestoreSession {
  return new RestoreSession({
    lifetimeMilliseconds: RESTORE_SESSION_LIFETIME_MILLISECONDS,
    scheduleExpiry: (callback) => {
      expiries.push(callback);
      return () => {
        expiries.splice(expiries.indexOf(callback), 1);
      };
    },
  });
}

/**
 * 创建假的主密码校验器: 是否设了主密码与等待的门都由假系统状态决定, 正确的主密码固定.
 * @param state 假系统状态.
 * @returns 主密码校验器.
 */
function createFakeVerifier(
  state: RestoreFixtureState,
): MasterPasswordVerifier {
  return {
    hasMasterPassword: async () => {
      await state.verifierGate;
      return state.hasMasterPassword;
    },
    verify: (password) =>
      Promise.resolve(password === SAMPLE_RESTORE_MASTER_PASSWORD),
  };
}

/**
 * 创建恢复服务的测试环境: 真实的加密测试库与文件系统, 假的对话框, 主密码校验与计时.
 * @param getOrm 取当前测试数据库查询入口的函数, 返回 undefined 模拟未解锁.
 * @param options 读取上限, 文件系统能力与时间.
 * @returns 测试环境.
 */
export function createRestoreFixture(
  getOrm: () => VaultOrm | undefined,
  options: RestoreFixtureOptions = {},
): RestoreFixture {
  const state: RestoreFixtureState = {
    chosenPath: undefined,
    hasMasterPassword: false,
    verifierGate: undefined,
  };
  const failures: unknown[] = [];
  const dialogRequests: unknown[] = [];
  const expiries: (() => void)[] = [];
  const session = createManualSession(expiries);
  const service = new RestoreService({
    dialogs: {
      showOpenDialog: (request) => {
        dialogRequests.push(request);
        return Promise.resolve(state.chosenPath);
      },
    },
    file: options.file ?? NODE_RESTORE_FILE,
    database: { getOrm, onFailure: (error) => void failures.push(error) },
    verifier: createFakeVerifier(state),
    session,
    translate: (key) => key,
    defaultDirectory: "default-directory",
    limits: options.limits ?? DEFAULT_RESTORE_LIMITS,
    now: options.now ?? (() => RESTORE_NOW),
  });
  const expireSession = (): void =>
    expiries.slice().forEach((callback) => callback());
  return { service, session, state, failures, dialogRequests, expireSession };
}

/**
 * 记录进度阶段的记录器: 在服务调用外部能力的那一刻记下服务当时所处的阶段, 测试里用它观察
 * 读取, 解密与写入时进度的阶段.
 */
export interface StageRecorder {
  /**
   * 记下的阶段, 按记录的先后.
   */
  readonly stages: RestoreStage[];
  /**
   * 记下服务此刻所处的阶段, 还没有挂上服务时记空闲.
   */
  readonly record: () => void;
  /**
   * 挂上要观察的服务.
   * @param service 恢复服务.
   */
  readonly attach: (service: RestoreService) => void;
}

/**
 * 创建进度阶段记录器.
 * @returns 记录器.
 */
export function createStageRecorder(): StageRecorder {
  const stages: RestoreStage[] = [];
  let attached: RestoreService | undefined;
  return {
    stages,
    record: () => {
      stages.push(attached?.getProgress().stage ?? "idle");
    },
    attach: (service) => {
      attached = service;
    },
  };
}

/**
 * 生成备份文件的选项.
 */
export interface GenerateBackupOptions {
  /**
   * 备份是否带附件, 默认带.
   */
  readonly includeAttachments?: boolean;
  /**
   * 加密口令, 不给时不加密.
   */
  readonly passphrase?: string;
}

/**
 * 用真实的备份生成器把一个库生成成备份文件. 调用方要先在库里写好数据.
 * @param orm 来源库的查询入口.
 * @param directory 备份临时目录所在的测试目录.
 * @param options 是否带附件, 加密口令.
 * @returns 备份文件的路径.
 */
export async function generateBackupFile(
  orm: VaultOrm,
  directory: string,
  options: GenerateBackupOptions = {},
): Promise<string> {
  const fixture = createEmailBackupFixture(() => orm, directory);
  const result = await fixture.generator.generate({
    includeAttachments: options.includeAttachments ?? true,
    passphrase: options.passphrase,
  });
  if (!result.ok) {
    throw new Error("生成备份失败");
  }
  return result.value.filePath;
}

/**
 * 用导出同一条加密流水线把字节口令加密成 age 文件的字节.
 * @param plaintext 明文字节.
 * @param passphrase 加密口令.
 * @returns 加密后的字节.
 */
export async function encryptBytes(
  plaintext: Buffer,
  passphrase: string,
): Promise<Buffer> {
  const sealed = await encryptExportStream(
    Readable.from([plaintext]),
    passphrase,
  );
  const chunks: Buffer[] = [];
  for await (const chunk of sealed) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/**
 * 把字节写成测试目录里的一个文件.
 * @param directory 测试目录.
 * @param fileName 文件名.
 * @param bytes 文件内容.
 * @returns 文件的路径.
 */
export async function writeBackupBytes(
  directory: string,
  fileName: string,
  bytes: Buffer,
): Promise<string> {
  const filePath = join(directory, fileName);
  await writeFile(filePath, bytes);
  return filePath;
}

/**
 * 在当前测试分组中登记钩子: 每个测试前在另一个临时目录里打开第二个全新的加密数据库, 作为恢复的
 * 目标库, 测试后关闭.
 * @param directoryName 临时目录的名称前缀.
 * @returns 取当前目标数据库的函数.
 */
export function useTargetVaultDatabase(
  directoryName: string,
): () => VaultDatabase {
  const getDirectory = useTemporaryDirectory(directoryName);
  let database: VaultDatabase;
  beforeEach(() => {
    database = openVaultDatabase({
      databaseFile: join(getDirectory(), "target-vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  });
  afterEach(() => {
    database.close();
  });
  return () => database;
}

/**
 * 恢复测试用到的三样东西: 来源库, 目标库与放备份文件的目录.
 */
export interface RestoreDatabases {
  /**
   * 取当前测试的来源库, 备份从它生成.
   */
  readonly getSource: () => VaultDatabase;
  /**
   * 取当前测试的目标库, 备份恢复到它里面.
   */
  readonly getTarget: () => VaultDatabase;
  /**
   * 取当前测试放备份文件的目录.
   */
  readonly getDirectory: () => string;
}

/**
 * 在当前测试分组中登记钩子, 准备来源库, 目标库与备份文件目录.
 * @param name 临时目录的名称前缀.
 * @returns 取来源库, 目标库与目录的函数.
 */
export function useRestoreDatabases(name: string): RestoreDatabases {
  return {
    getSource: useVaultDatabase(`${name}-source`),
    getTarget: useTargetVaultDatabase(`${name}-target`),
    getDirectory: useTemporaryDirectory(`${name}-files`),
  };
}

/**
 * 往来源库写入导出样例, 用真实的备份生成器生成备份文件, 并让对话框选中它.
 * @param fixture 恢复服务的测试环境.
 * @param databases 来源库, 目标库与目录.
 * @param options 是否带附件, 加密口令.
 * @returns 备份文件的路径.
 */
export async function prepareChosenBackup(
  fixture: RestoreFixture,
  databases: RestoreDatabases,
  options: GenerateBackupOptions = {},
): Promise<string> {
  const source = databases.getSource().orm;
  seedExportSample(source);
  const path = await generateBackupFile(
    source,
    databases.getDirectory(),
    options,
  );
  fixture.state.chosenPath = path;
  return path;
}
