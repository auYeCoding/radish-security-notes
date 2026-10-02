import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { dataKeyToRecoveryWords } from "../vault/recovery-phrase";
import type { RecoveryTextFileLabels } from "./recovery-text-file-labels";
import {
  RecoveryTextFileSaver,
  type RecoveryTextFilePort,
} from "./recovery-text-file-saver";

/**
 * 测试用的文案.
 */
const LABELS: RecoveryTextFileLabels = {
  title: "标题",
  generated: "生成日期",
  usage: "用法",
  warning: "警示",
  dialogTitle: "保存恢复词",
  fileTypeName: "文本文件",
};

/**
 * 测试用的一组合法恢复词.
 */
const WORDS = dataKeyToRecoveryWords(Buffer.alloc(32, 7));

/**
 * 创建带间谍方法的假系统能力.
 * @param chosenPath 保存对话框返回的路径, undefined 表示用户取消.
 * @returns 假系统能力.
 */
function createFakePort(chosenPath: string | undefined): RecoveryTextFilePort {
  return {
    showSaveDialog: vi.fn(() => Promise.resolve(chosenPath)),
    writeTextFile: vi.fn(() => Promise.resolve()),
  };
}

/**
 * 创建保存器.
 * @param port 假系统能力.
 * @param onFailure 写文件失败的回调.
 * @returns 保存器.
 */
function createSaver(
  port: RecoveryTextFilePort,
  onFailure: (error: unknown) => void = () => undefined,
): RecoveryTextFileSaver {
  return new RecoveryTextFileSaver({
    port,
    defaultDirectory: join("C:", "Documents"),
    now: () => new Date(2026, 9, 2, 8, 30),
    readLabels: () => LABELS,
    onFailure,
  });
}

describe("RecoveryTextFileSaver 保存", () => {
  it("预填默认文件名并把内容写到用户选的路径", async () => {
    const port = createFakePort("D:\\keep\\words.txt");

    const status = await createSaver(port).save(WORDS);

    expect(status).toBe("saved");
    expect(port.showSaveDialog).toHaveBeenCalledWith({
      defaultPath: join(
        "C:",
        "Documents",
        "radish-recovery-key-2026-10-02.txt",
      ),
      title: "保存恢复词",
      fileTypeName: "文本文件",
      extension: "txt",
    });
    expect(port.writeTextFile).toHaveBeenCalledWith(
      "D:\\keep\\words.txt",
      expect.stringContaining(`01. ${WORDS[0]}`),
    );
  });

  it("接受大小写不同的输入, 内容里写规整后的词", async () => {
    const port = createFakePort("D:\\keep\\words.txt");

    await createSaver(port).save(WORDS.map((word) => word.toUpperCase()));

    expect(port.writeTextFile).toHaveBeenCalledWith(
      "D:\\keep\\words.txt",
      expect.stringContaining(`24. ${WORDS[23]}`),
    );
  });
});

describe("RecoveryTextFileSaver 取消与失败", () => {
  it("用户取消时不写文件", async () => {
    const port = createFakePort(undefined);

    const status = await createSaver(port).save(WORDS);

    expect(status).toBe("cancelled");
    expect(port.writeTextFile).not.toHaveBeenCalled();
  });

  it("写文件失败时返回 failed 并通知回调, 回调拿到底层错误", async () => {
    const port: RecoveryTextFilePort = {
      showSaveDialog: () => Promise.resolve("D:\\keep\\words.txt"),
      writeTextFile: () => Promise.reject(new Error("磁盘已满")),
    };
    const onFailure = vi.fn();

    const status = await createSaver(port, onFailure).save(WORDS);

    expect(status).toBe("failed");
    expect(onFailure).toHaveBeenCalledWith(new Error("磁盘已满"));
  });

  it("不是合法恢复词时抛错, 不弹对话框也不写文件", async () => {
    const port = createFakePort("D:\\keep\\words.txt");
    const bogus = [...WORDS];
    bogus[3] = "notaword";

    await expect(createSaver(port).save(bogus)).rejects.toThrow();
    await expect(createSaver(port).save(WORDS.slice(1))).rejects.toThrow();
    expect(port.showSaveDialog).not.toHaveBeenCalled();
    expect(port.writeTextFile).not.toHaveBeenCalled();
  });
});
