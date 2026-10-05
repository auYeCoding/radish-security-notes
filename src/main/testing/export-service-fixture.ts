import { Writable } from "node:stream";

import type { ExportRequest } from "@shared/export/export-request";

import { ExportService } from "../export/export-service";
import type {
  ExportFilePort,
  ExportSaveDialogRequest,
} from "../export/export-ports";
import { createDefaultExportSerializerRegistry } from "../export/serializers/default-serializer-registry";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 测试里用户选定的保存路径.
 */
export const SAMPLE_TARGET_PATH = "C:/exports/backup.out";

/**
 * 测试里保险库主密码的正确取值.
 */
export const SAMPLE_MASTER_PASSWORD = "correct-master-password";

/**
 * 假系统能力的可变状态, 测试通过它布置输入, 检查输出.
 */
export interface ExportFixtureState {
  /**
   * 保存对话框将返回的路径, 设为 undefined 表示用户取消.
   */
  saveDialogResult: string | undefined;
  /**
   * 弹出过的保存对话框的预填信息.
   */
  readonly dialogRequests: ExportSaveDialogRequest[];
  /**
   * 假文件系统里的正式文件: 路径到内容.
   */
  readonly files: Map<string, Buffer>;
  /**
   * 还没有改名也没有删除的临时文件: 路径到已写入的块.
   */
  readonly temporaryFiles: Map<string, Buffer[]>;
  /**
   * 被删除过的临时文件路径.
   */
  readonly removedPaths: string[];
  /**
   * 在文件管理器里定位过的路径.
   */
  readonly revealedPaths: string[];
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
  /**
   * 保险库是否设了主密码.
   */
  hasMasterPassword: boolean;
  /**
   * 写入多少块之后让写入失败, 不给则不失败.
   */
  failWriteAfterChunks: number | undefined;
  /**
   * 为真时改名抛出权限错误.
   */
  failRename: boolean;
  /**
   * 服务让出事件循环的次数.
   */
  yieldCount: number;
  /**
   * 每次让出事件循环时调用, 测试用它在导出中途观察进度或取消.
   */
  onYield: (() => void) | undefined;
}

/**
 * 测试里的一次导出服务环境.
 */
export interface ExportServiceFixture {
  /**
   * 被测的导出服务.
   */
  readonly service: ExportService;
  /**
   * 假系统能力的可变状态.
   */
  readonly state: ExportFixtureState;
}

/**
 * 建初始的假系统能力状态: 保存对话框返回样例路径, 设了主密码.
 * @returns 假系统能力的状态.
 */
function createState(): ExportFixtureState {
  return {
    saveDialogResult: SAMPLE_TARGET_PATH,
    dialogRequests: [],
    files: new Map(),
    temporaryFiles: new Map(),
    removedPaths: [],
    revealedPaths: [],
    failures: [],
    hasMasterPassword: true,
    failWriteAfterChunks: undefined,
    failRename: false,
    yieldCount: 0,
    onYield: undefined,
  };
}

/**
 * 建往假临时文件写入的可写流: 块记进状态, 写入给定块数之后让写入失败.
 * @param state 假系统能力的状态.
 * @param chunks 临时文件已写入的块.
 * @returns 可写流.
 */
function createTemporaryWritable(
  state: ExportFixtureState,
  chunks: Buffer[],
): Writable {
  return new Writable({
    write: (chunk: Buffer, _encoding, callback) => {
      if (
        state.failWriteAfterChunks !== undefined &&
        chunks.length >= state.failWriteAfterChunks
      ) {
        callback(Object.assign(new Error("磁盘已满"), { code: "ENOSPC" }));
        return;
      }
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });
}

/**
 * 基于假状态的文件系统端口: 临时文件在内存里, 改名把它放进正式文件, 删除记录路径.
 * @param state 假系统能力的状态.
 * @returns 文件系统端口.
 */
function createFilePort(state: ExportFixtureState): ExportFilePort {
  let counter = 0;
  return {
    createTemporaryFile: async (targetPath) => {
      counter += 1;
      const path = `${targetPath}.${counter}.partial`;
      const chunks: Buffer[] = [];
      state.temporaryFiles.set(path, chunks);
      return {
        path,
        stream: createTemporaryWritable(state, chunks),
        bytesWritten: () => Buffer.concat(chunks).length,
        finalize: async () => undefined,
        abandon: async () => undefined,
      };
    },
    replaceTarget: async (temporaryPath, targetPath) => {
      if (state.failRename) {
        throw Object.assign(new Error("拒绝访问"), { code: "EPERM" });
      }
      const chunks = state.temporaryFiles.get(temporaryPath) ?? [];
      state.files.set(targetPath, Buffer.concat(chunks));
      state.temporaryFiles.delete(temporaryPath);
    },
    removeFile: async (filePath) => {
      state.removedPaths.push(filePath);
      state.temporaryFiles.delete(filePath);
    },
  };
}

/**
 * 构造一个导出请求, 没给的部分取: 本应用格式, 全部范围, 含保密字段与附件, 正确的主密码, 已确认
 * 明文风险, 不加密.
 * @param overrides 要覆盖的部分.
 * @returns 导出请求.
 */
export function exportRequestOf(
  overrides: Partial<ExportRequest> = {},
): ExportRequest {
  return {
    format: "native",
    scope: { kind: "all" },
    includeSecrets: true,
    includeAttachments: true,
    masterPassword: SAMPLE_MASTER_PASSWORD,
    hasAcknowledgedPlaintextRisk: true,
    ...overrides,
  };
}

/**
 * 创建导出服务的测试环境: 假对话框, 假文件系统, 假外壳, 默认的序列化器登记表, 假主密码校验器,
 * 取库用给定的函数. 文案函数返回键本身, 当前时间固定为 2026-10-05 中午, 便于断言.
 * @param getOrm 取数据库的函数.
 * @returns 导出服务环境.
 */
export function createExportServiceFixture(
  getOrm: () => VaultOrm | undefined,
): ExportServiceFixture {
  const state = createState();
  const service = new ExportService({
    dialogs: {
      showSaveDialog: async (request) => {
        state.dialogRequests.push(request);
        return state.saveDialogResult;
      },
    },
    file: createFilePort(state),
    shell: { showItemInFolder: (path) => state.revealedPaths.push(path) },
    serializers: createDefaultExportSerializerRegistry(),
    database: { getOrm, onFailure: (error) => state.failures.push(error) },
    verifier: {
      hasMasterPassword: async () => state.hasMasterPassword,
      verify: async (password) => password === SAMPLE_MASTER_PASSWORD,
    },
    translate: (key) => key,
    defaultDirectory: "C:/Users/test/Documents",
    now: () => new Date(2026, 9, 5, 12, 0, 0),
    yieldToEventLoop: async () => {
      state.yieldCount += 1;
      state.onYield?.();
    },
  });
  return { service, state };
}
