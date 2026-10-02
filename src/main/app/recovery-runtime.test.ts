import { join } from "node:path";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { readRecoveryTextFileLabels } from "../recovery/recovery-text-file-labels";
import { dataKeyToRecoveryWords } from "../vault/recovery-phrase";
import {
  createRecoveryRuntime,
  type RecoveryRuntime,
} from "./recovery-runtime";

/**
 * 替身 electron 模块里的间谍方法: 取系统路径, 取焦点窗口, 弹保存对话框.
 */
const electronMocks = vi.hoisted(() => ({
  getPath: vi.fn(),
  getFocusedWindow: vi.fn(),
  showSaveDialog: vi.fn(),
}));

/**
 * 替身文件系统模块里的间谍方法: 写文件.
 */
const fileSystemMocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
}));

vi.mock("electron", () => ({
  app: { getPath: electronMocks.getPath },
  BrowserWindow: { getFocusedWindow: electronMocks.getFocusedWindow },
  dialog: { showSaveDialog: electronMocks.showSaveDialog },
}));

vi.mock("node:fs/promises", () => ({
  writeFile: fileSystemMocks.writeFile,
}));

/**
 * 测试用的文档目录, 保存对话框默认打开它.
 */
const DOCUMENTS_DIRECTORY = join("C:", "Documents");

/**
 * 测试用的用户选定路径.
 */
const CHOSEN_PATH = join("D:", "keep", "words.txt");

/**
 * 测试用的一组合法恢复词.
 */
const WORDS = dataKeyToRecoveryWords(Buffer.alloc(32, 7));

/**
 * 英文界面下的恢复运行时, 附带它保存对话框用到的英文文案.
 */
interface EnglishRuntimeFixture {
  /**
   * 被测的恢复运行时.
   */
  readonly runtime: RecoveryRuntime;
  /**
   * 保存对话框的英文标题.
   */
  readonly dialogTitle: string;
  /**
   * 保存对话框文件类型过滤器里的英文名称.
   */
  readonly fileTypeName: string;
}

/**
 * 创建英文界面下的恢复运行时.
 * @returns 恢复运行时与同一份英文文案.
 */
async function createEnglishRuntime(): Promise<EnglishRuntimeFixture> {
  const translator = await createI18nInstance({
    language: "en",
    isPseudoLocalizationEnabled: false,
  });
  const labels = readRecoveryTextFileLabels(translator, "2026-10-02");
  return {
    runtime: createRecoveryRuntime(translator),
    dialogTitle: labels.dialogTitle,
    fileTypeName: labels.fileTypeName,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 2, 8, 30));
  electronMocks.getPath.mockReturnValue(DOCUMENTS_DIRECTORY);
  electronMocks.getFocusedWindow.mockReturnValue(null);
  electronMocks.showSaveDialog.mockResolvedValue({
    canceled: false,
    filePath: CHOSEN_PATH,
  });
  fileSystemMocks.writeFile.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("createRecoveryRuntime 保存对话框", () => {
  it("没有焦点窗口时直接弹出对话框, 预填文档目录下的默认文件名", async () => {
    const { runtime, dialogTitle, fileTypeName } = await createEnglishRuntime();

    const status = await runtime.textFileSaver.save(WORDS);

    expect(status).toBe("saved");
    expect(electronMocks.getPath).toHaveBeenCalledWith("documents");
    expect(electronMocks.showSaveDialog).toHaveBeenCalledWith({
      title: dialogTitle,
      defaultPath: join(
        DOCUMENTS_DIRECTORY,
        "radish-recovery-key-2026-10-02.txt",
      ),
      filters: [{ name: fileTypeName, extensions: ["txt"] }],
    });
  });

  it("有焦点窗口时对话框作为它的模态子窗口", async () => {
    const focusedWindow = { id: 1 };
    electronMocks.getFocusedWindow.mockReturnValue(focusedWindow);
    const { runtime, dialogTitle } = await createEnglishRuntime();

    await runtime.textFileSaver.save(WORDS);

    expect(electronMocks.showSaveDialog).toHaveBeenCalledWith(
      focusedWindow,
      expect.objectContaining({ title: dialogTitle }),
    );
  });
});

describe("createRecoveryRuntime 写文件", () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("把含恢复词的内容以 UTF-8 写到用户选的路径", async () => {
    const { runtime } = await createEnglishRuntime();

    await runtime.textFileSaver.save(WORDS);

    expect(fileSystemMocks.writeFile).toHaveBeenCalledWith(
      CHOSEN_PATH,
      expect.stringContaining(`01. ${WORDS[0]}`),
      "utf8",
    );
  });

  it("用户取消对话框时不写文件", async () => {
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: true });
    const { runtime } = await createEnglishRuntime();

    const status = await runtime.textFileSaver.save(WORDS);

    expect(status).toBe("cancelled");
    expect(fileSystemMocks.writeFile).not.toHaveBeenCalled();
  });

  it("写文件失败时返回 failed, 日志只含错误名称与信息, 不含恢复词", async () => {
    fileSystemMocks.writeFile.mockRejectedValue(new Error("磁盘已满"));
    const { runtime } = await createEnglishRuntime();

    const status = await runtime.textFileSaver.save(WORDS);

    expect(status).toBe("failed");
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "[恢复词] 操作失败, Error: 磁盘已满",
    );
  });
});
