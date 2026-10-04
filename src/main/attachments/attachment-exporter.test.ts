import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createFakeDialogs } from "../testing/attachment-ports-fixture";
import {
  createUnlockedAttachmentFixture,
  fileOf,
} from "../testing/attachment-service-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { AttachmentExporter } from "./attachment-exporter";
import { NODE_ATTACHMENT_SINK } from "./node-attachment-file-system";

/**
 * 测试用的对话框标题.
 */
const LABELS = { openTitle: "选择文件", saveTitle: "另存为" };

describe("AttachmentExporter.saveAs", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-exporter");

  it("把附件内容逐字节写到用户选的路径, 保存对话框预填默认目录下的附件名", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const bytes = Array.from({ length: 256 }, (_, value) => value);
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("证书-密钥(测试).pem", bytes),
    ]);
    const targetPath = join(getDirectory(), "取出的证书.pem");
    const dialogs = createFakeDialogs(undefined, targetPath);
    const exporter = new AttachmentExporter({
      service: workspace.attachments,
      dialogs: dialogs.port,
      sink: NODE_ATTACHMENT_SINK,
      readDialogLabels: () => LABELS,
      defaultDirectory: "文档目录",
      createIdentifier: () => "unique",
      onFailure: vi.fn(),
    });

    const result = await exporter.saveAs("att-1");

    expect(result).toEqual({ ok: true, value: "saved" });
    expect(dialogs.saveRequests).toEqual([
      {
        title: "另存为",
        defaultPath: join("文档目录", "证书-密钥(测试).pem"),
      },
    ]);
    expect((await readFile(targetPath)).equals(Buffer.from(bytes))).toBe(true);
    expect(await readdir(getDirectory())).toEqual(["取出的证书.pem"]);
  });
});

describe("AttachmentExporter.saveAs 覆盖与取消", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-exporter-overwrite");

  it("目标文件已存在时被覆盖为附件内容", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("a.bin", [9, 9]),
    ]);
    const targetPath = join(getDirectory(), "已有.bin");
    await writeFile(targetPath, "旧内容");
    const exporter = new AttachmentExporter({
      service: workspace.attachments,
      dialogs: createFakeDialogs(undefined, targetPath).port,
      sink: NODE_ATTACHMENT_SINK,
      readDialogLabels: () => LABELS,
      defaultDirectory: "文档目录",
      createIdentifier: () => "unique",
      onFailure: vi.fn(),
    });

    await exporter.saveAs("att-1");

    expect(await readFile(targetPath)).toEqual(Buffer.from([9, 9]));
  });

  it("用户取消保存对话框时返回 cancelled, 不写任何文件", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [fileOf("a.bin", 2)]);
    const sink = { ...NODE_ATTACHMENT_SINK, writeFile: vi.fn() };
    const exporter = new AttachmentExporter({
      service: workspace.attachments,
      dialogs: createFakeDialogs(undefined, undefined).port,
      sink,
      readDialogLabels: () => LABELS,
      defaultDirectory: "文档目录",
      createIdentifier: () => "unique",
      onFailure: vi.fn(),
    });

    const result = await exporter.saveAs("att-1");

    expect(result).toEqual({ ok: true, value: "cancelled" });
    expect(sink.writeFile).not.toHaveBeenCalled();
  });
});

describe("AttachmentExporter.saveAs 附件不存在", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-exporter-missing");

  it("没有这个附件时失败, 不弹保存对话框", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const dialogs = createFakeDialogs(undefined, join(getDirectory(), "x"));
    const exporter = new AttachmentExporter({
      service: workspace.attachments,
      dialogs: dialogs.port,
      sink: NODE_ATTACHMENT_SINK,
      readDialogLabels: () => LABELS,
      defaultDirectory: "文档目录",
      createIdentifier: () => "unique",
      onFailure: vi.fn(),
    });

    expect(await exporter.saveAs("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(dialogs.saveRequests).toEqual([]);
  });
});

describe("AttachmentExporter.saveAs 写出失败", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-exporter-failure");

  it("改名失败时删掉临时文件, 目标位置没有留下任何文件, 返回 write-failed 并通知回调", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [fileOf("a.bin", 4)]);
    const renameError = new Error("EPERM");
    const onFailure = vi.fn();
    const exporter = new AttachmentExporter({
      service: workspace.attachments,
      dialogs: createFakeDialogs(undefined, join(getDirectory(), "目标.bin"))
        .port,
      sink: {
        ...NODE_ATTACHMENT_SINK,
        renameFile: () => Promise.reject(renameError),
      },
      readDialogLabels: () => LABELS,
      defaultDirectory: "文档目录",
      createIdentifier: () => "unique",
      onFailure,
    });

    const result = await exporter.saveAs("att-1");

    expect(result).toEqual({ ok: false, reason: "write-failed" });
    expect(onFailure).toHaveBeenCalledWith(renameError);
    expect(await readdir(getDirectory())).toEqual([]);
  });
});

describe("AttachmentExporter.saveAs 写入失败", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-exporter-write");

  it("写入失败时返回 write-failed, 清理临时文件的失败也只通知回调", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [fileOf("a.bin", 4)]);
    const writeError = new Error("ENOSPC");
    const removeError = new Error("EBUSY");
    const onFailure = vi.fn();
    const exporter = new AttachmentExporter({
      service: workspace.attachments,
      dialogs: createFakeDialogs(undefined, join(getDirectory(), "目标.bin"))
        .port,
      sink: {
        writeFile: () => Promise.reject(writeError),
        renameFile: vi.fn(),
        removeFile: () => Promise.reject(removeError),
      },
      readDialogLabels: () => LABELS,
      defaultDirectory: "文档目录",
      createIdentifier: () => "unique",
      onFailure,
    });

    const result = await exporter.saveAs("att-1");

    expect(result).toEqual({ ok: false, reason: "write-failed" });
    expect(onFailure).toHaveBeenNthCalledWith(1, writeError);
    expect(onFailure).toHaveBeenNthCalledWith(2, removeError);
  });
});
