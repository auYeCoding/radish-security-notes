import { createDefaultSourceRegistry } from "../import/default-source-registry";
import type {
  ImportDialogPort,
  ImportFilePort,
  ImportReportSinkPort,
  ImportShellPort,
} from "../import/import-ports";
import { ImportService } from "../import/import-service";
import { ImportSession } from "../import/import-session";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 测试里假的来源文件路径.
 */
export const SAMPLE_SOURCE_PATH = "C:/exports/sample-export.json";

/**
 * 测试里假的保存清单路径.
 */
export const SAMPLE_REPORT_PATH = "C:/exports/report.txt";

/**
 * 假系统能力的可变状态, 测试通过它布置输入, 检查输出.
 */
export interface ImportFixtureState {
  /**
   * 假文件系统: 路径到文件内容.
   */
  readonly files: Map<string, Buffer>;
  /**
   * 选择文件对话框将返回的路径, 设为 undefined 表示用户取消.
   */
  openDialogResult: string | undefined;
  /**
   * 保存对话框将返回的路径, 设为 undefined 表示用户取消.
   */
  saveDialogResult: string | undefined;
  /**
   * 写出过的文本文件: 路径与内容.
   */
  readonly writtenFiles: Map<string, string>;
  /**
   * 在文件管理器里定位过的文件路径.
   */
  readonly revealedPaths: string[];
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
  /**
   * 会话里待执行的超时回调.
   */
  readonly expiryCallbacks: (() => void)[];
  /**
   * 服务让出事件循环的次数.
   */
  yieldCount: number;
  /**
   * 每次让出事件循环时调用, 测试用它在处理中途观察进度或取消.
   */
  onYield: (() => void) | undefined;
  /**
   * 为真时写出清单文件抛出错误.
   */
  failWrite: boolean;
}

/**
 * 测试里的一次导入服务环境.
 */
export interface ImportServiceFixture {
  /**
   * 被测的导入服务.
   */
  readonly service: ImportService;
  /**
   * 假系统能力的可变状态.
   */
  readonly state: ImportFixtureState;
}

/**
 * 建初始的假系统能力状态: 两个对话框都返回样例路径, 其余为空.
 * @returns 假系统能力的状态.
 */
function createState(): ImportFixtureState {
  return {
    files: new Map(),
    openDialogResult: SAMPLE_SOURCE_PATH,
    saveDialogResult: SAMPLE_REPORT_PATH,
    writtenFiles: new Map(),
    revealedPaths: [],
    failures: [],
    expiryCallbacks: [],
    yieldCount: 0,
    onYield: undefined,
    failWrite: false,
  };
}

/**
 * 基于假状态的文件系统端口.
 * @param state 假系统能力的状态.
 * @returns 文件系统端口, 读不到的路径抛错.
 */
function createFilePort(state: ImportFixtureState): ImportFilePort {
  return {
    statFile: async (path) => {
      const bytes = state.files.get(path);
      if (bytes === undefined) {
        throw new Error("ENOENT");
      }
      return { isFile: true, size: bytes.length };
    },
    readFile: async (path) => Buffer.from(state.files.get(path) ?? ""),
  };
}

/**
 * 假的对话框, 清单写出与外壳端口.
 */
interface SystemPorts {
  /**
   * 假系统对话框.
   */
  readonly dialogs: ImportDialogPort;
  /**
   * 假清单写出能力.
   */
  readonly reportSink: ImportReportSinkPort;
  /**
   * 假外壳能力.
   */
  readonly shell: ImportShellPort;
}

/**
 * 基于假状态的对话框, 清单写出与外壳端口.
 * @param state 假系统能力的状态.
 * @returns 对话框, 清单写出与外壳端口.
 */
function createSystemPorts(state: ImportFixtureState): SystemPorts {
  return {
    dialogs: {
      showOpenDialog: async () => state.openDialogResult,
      showSaveDialog: async () => state.saveDialogResult,
    },
    reportSink: {
      writeTextFile: async (path, text) => {
        if (state.failWrite) {
          throw new Error("EACCES");
        }
        state.writtenFiles.set(path, text);
      },
    },
    shell: { showItemInFolder: (path) => state.revealedPaths.push(path) },
  };
}

/**
 * 创建一个生成 import-1, import-2 ... 编号的函数.
 * @param failAt 第几次生成编号时抛出错误, 不给则不抛.
 * @returns 生成编号的函数.
 */
function createIdentifierSource(failAt: number | undefined): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    if (counter === failAt) {
      throw new Error("注入的失败");
    }
    return `import-${counter}`;
  };
}

/**
 * 创建导入服务的测试环境: 假对话框, 假文件系统, 假外壳, 默认的来源适配器登记表, 取库用给定的
 * 函数. 编号依次为 import-1, import-2, 文案函数返回键与占位值, 便于断言.
 * @param getOrm 取数据库的函数.
 * @param failIdentifierAt 第几次生成编号时抛出错误, 用来在写库中途注入失败, 不给则不抛.
 * @returns 导入服务环境.
 */
export function createImportServiceFixture(
  getOrm: () => VaultOrm | undefined,
  failIdentifierAt?: number,
): ImportServiceFixture {
  const state = createState();
  const service = new ImportService({
    ...createSystemPorts(state),
    file: createFilePort(state),
    registry: createDefaultSourceRegistry(),
    database: { getOrm, onFailure: (error) => state.failures.push(error) },
    session: new ImportSession({
      lifetimeMilliseconds: 600000,
      scheduleExpiry: (callback) => {
        state.expiryCallbacks.push(callback);
        return () => undefined;
      },
    }),
    translate: (key, values) =>
      values === undefined ? key : `${key}:${JSON.stringify(values)}`,
    defaultDirectory: "C:/Users/test/Documents",
    createIdentifier: createIdentifierSource(failIdentifierAt),
    now: () => 1000,
    yieldToEventLoop: async () => {
      state.yieldCount += 1;
      state.onYield?.();
    },
  });
  return { service, state };
}
