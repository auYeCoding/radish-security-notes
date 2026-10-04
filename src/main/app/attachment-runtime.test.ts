import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import type { VaultService } from "../vault/vault-service";
import { createAttachmentRuntime } from "./attachment-runtime";

/**
 * 替身 electron 模块里的间谍方法与可变的用户数据目录.
 */
const electronMocks = vi.hoisted(() => ({
  userDataDirectory: { current: "" },
  getFocusedWindow: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  openPath: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData"
        ? electronMocks.userDataDirectory.current
        : "C:\\Documents",
  },
  BrowserWindow: { getFocusedWindow: electronMocks.getFocusedWindow },
  dialog: {
    showOpenDialog: electronMocks.showOpenDialog,
    showSaveDialog: electronMocks.showSaveDialog,
  },
  shell: { openPath: electronMocks.openPath },
}));

/**
 * 没有数据库的假保险库, 够用来创建运行时.
 */
const LOCKED_VAULT = { getOrm: () => undefined } as unknown as VaultService;

/**
 * 英文界面下的主进程 i18next 实例.
 * @returns 翻译器.
 */
function createEnglishTranslator(): ReturnType<typeof createI18nInstance> {
  return createI18nInstance({
    language: "en",
    isPseudoLocalizationEnabled: false,
  });
}

beforeEach(() => {
  electronMocks.getFocusedWindow.mockReturnValue(null);
  electronMocks.showOpenDialog.mockResolvedValue({
    canceled: true,
    filePaths: [],
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("createAttachmentRuntime 临时副本", () => {
  const getDirectory = useTemporaryDirectory("attachment-runtime");

  it("创建时清扫上次运行残留在专属目录里的副本", async () => {
    electronMocks.userDataDirectory.current = getDirectory();
    const leftover = join(getDirectory(), "attachment-open", "old-1");
    await mkdir(leftover, { recursive: true });
    await writeFile(join(leftover, "残留.txt"), "明文");

    createAttachmentRuntime(LOCKED_VAULT, await createEnglishTranslator());

    expect(existsSync(join(getDirectory(), "attachment-open"))).toBe(false);
  });

  it("discardTemporaryCopies 删除本次运行创建的副本", async () => {
    electronMocks.userDataDirectory.current = getDirectory();
    const runtime = createAttachmentRuntime(
      LOCKED_VAULT,
      await createEnglishTranslator(),
    );
    const copy = join(getDirectory(), "attachment-open", "new-1");
    await mkdir(copy, { recursive: true });
    await writeFile(join(copy, "本次.txt"), "明文");

    runtime.discardTemporaryCopies();

    expect(existsSync(join(getDirectory(), "attachment-open"))).toBe(false);
  });
});

describe("createAttachmentRuntime 选择文件对话框", () => {
  const getDirectory = useTemporaryDirectory("attachment-runtime-dialog");

  it("可多选, 标题随界面语言, 默认打开文档目录, 取消时不添加", async () => {
    electronMocks.userDataDirectory.current = getDirectory();
    const runtime = createAttachmentRuntime(
      LOCKED_VAULT,
      await createEnglishTranslator(),
    );

    const result = await runtime.importer.importFromDialog("entry-1");

    expect(electronMocks.showOpenDialog).toHaveBeenCalledWith({
      title: "Choose files to attach",
      defaultPath: "C:\\Documents",
      properties: ["openFile", "multiSelections"],
    });
    expect(result).toEqual({ ok: true, value: { status: "cancelled" } });
  });

  it("有焦点窗口时对话框作为它的模态子窗口", async () => {
    electronMocks.userDataDirectory.current = getDirectory();
    const focusedWindow = { id: 1 };
    electronMocks.getFocusedWindow.mockReturnValue(focusedWindow);
    const runtime = createAttachmentRuntime(
      LOCKED_VAULT,
      await createEnglishTranslator(),
    );

    await runtime.importer.importFromDialog("entry-1");

    expect(electronMocks.showOpenDialog).toHaveBeenCalledWith(
      focusedWindow,
      expect.objectContaining({ title: "Choose files to attach" }),
    );
  });
});
