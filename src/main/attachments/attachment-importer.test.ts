import { describe, expect, it, vi } from "vitest";

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTRY,
} from "@shared/attachments/attachment-limits";

import {
  createFakeDialogs,
  createFakeSource,
  virtualPath,
  type FakeSourceFile,
} from "../testing/attachment-ports-fixture";
import {
  createUnlockedAttachmentFixture,
  listStoredAttachmentIds,
  type AttachmentWorkspaceFixture,
} from "../testing/attachment-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { AttachmentCandidateReader } from "./attachment-candidate-reader";
import { AttachmentImporter } from "./attachment-importer";

/**
 * 测试用的对话框标题.
 */
const LABELS = { openTitle: "选择文件", saveTitle: "另存为" };

/**
 * 测试里的一个导入器与它用到的假端口.
 */
interface ImporterFixture {
  /**
   * 被测的导入器.
   */
  readonly importer: AttachmentImporter;
  /**
   * 假源文件系统.
   */
  readonly source: ReturnType<typeof createFakeSource>;
  /**
   * 假对话框.
   */
  readonly dialogs: ReturnType<typeof createFakeDialogs>;
}

/**
 * 在附件工作环境上创建导入器.
 * @param workspace 附件工作环境.
 * @param files 假源文件系统里的文件.
 * @param chosenPaths 选择文件对话框的结果.
 * @returns 导入器, 以及假源文件系统与假对话框.
 */
function createImporter(
  workspace: AttachmentWorkspaceFixture,
  files: Readonly<Record<string, FakeSourceFile>>,
  chosenPaths: readonly string[] | undefined = undefined,
): ImporterFixture {
  const source = createFakeSource(files);
  const dialogs = createFakeDialogs(chosenPaths);
  const importer = new AttachmentImporter({
    service: workspace.attachments,
    reader: new AttachmentCandidateReader({
      source: source.port,
      onFailure: vi.fn(),
    }),
    dialogs: dialogs.port,
    readDialogLabels: () => LABELS,
    defaultDirectory: "文档目录",
  });
  return { importer, source, dialogs };
}

describe("AttachmentImporter.importFromDialog", () => {
  const getHarness = useVaultServiceHarness();

  it("对话框选了多个文件时按选择顺序添加, 对话框标题与默认目录来自依赖", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer, dialogs } = createImporter(
      workspace,
      {
        [virtualPath("甲.txt")]: { content: Buffer.from([1, 2]) },
        [virtualPath("乙.pem")]: { content: Buffer.from([3]) },
      },
      [virtualPath("甲.txt"), virtualPath("乙.pem")],
    );

    const result = await importer.importFromDialog(workspace.entryId);

    expect(result).toEqual({
      ok: true,
      value: {
        status: "added",
        attachments: [
          { id: "att-1", name: "甲.txt", size: 2 },
          { id: "att-2", name: "乙.pem", size: 1 },
        ],
      },
    });
    expect(dialogs.openRequests).toEqual([
      { title: "选择文件", defaultDirectory: "文档目录" },
    ]);
  });

  it("用户取消对话框时返回 cancelled, 不添加也不读取任何文件", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer, source } = createImporter(workspace, {}, undefined);

    const result = await importer.importFromDialog(workspace.entryId);

    expect(result).toEqual({ ok: true, value: { status: "cancelled" } });
    expect(source.readFile).not.toHaveBeenCalled();
    expect(listStoredAttachmentIds(workspace.vault).metadata).toEqual([]);
  });

  it("对话框没有选文件时同样视为取消", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer } = createImporter(workspace, {}, []);

    expect(await importer.importFromDialog(workspace.entryId)).toEqual({
      ok: true,
      value: { status: "cancelled" },
    });
  });
});

describe("AttachmentImporter.importPaths 的失败与回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("没有路径时是无效输入", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer } = createImporter(workspace, {});

    expect(await importer.importPaths(workspace.entryId, [])).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });

  it("有文件是空文件时整次都不添加, 不读取任何文件内容", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer, source } = createImporter(workspace, {
      [virtualPath("好.txt")]: { content: Buffer.from([1]) },
      [virtualPath("空.txt")]: { content: Buffer.alloc(0) },
    });

    const result = await importer.importPaths(workspace.entryId, [
      virtualPath("好.txt"),
      virtualPath("空.txt"),
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "empty-file",
      fileName: "空.txt",
    });
    expect(source.readFile).not.toHaveBeenCalled();
    expect(listStoredAttachmentIds(workspace.vault).metadata).toEqual([]);
  });
});

describe("AttachmentImporter.importPaths 的预检", () => {
  const getHarness = useVaultServiceHarness();

  it("超过个数上限的批次在读取内容之前就被预检挡掉", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const names = Array.from(
      { length: MAX_ATTACHMENTS_PER_ENTRY + 1 },
      (_, index) => `f-${index}.txt`,
    );
    const { importer, source } = createImporter(
      workspace,
      Object.fromEntries(
        names.map((name) => [virtualPath(name), { content: Buffer.alloc(1) }]),
      ),
    );

    const result = await importer.importPaths(
      workspace.entryId,
      names.map(virtualPath),
    );

    expect(result).toEqual({ ok: false, reason: "too-many-attachments" });
    expect(source.readFile).not.toHaveBeenCalled();
  });

  it("总大小超过上限的批次在读取内容之前就被预检挡掉", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const names = ["a.bin", "b.bin", "c.bin", "d.bin", "e.bin"];
    const { importer, source } = createImporter(
      workspace,
      Object.fromEntries(
        names.map((name) => [
          virtualPath(name),
          { content: Buffer.alloc(1), reportedSize: MAX_ATTACHMENT_BYTES },
        ]),
      ),
    );

    const result = await importer.importPaths(
      workspace.entryId,
      names.map(virtualPath),
    );

    expect(result).toEqual({ ok: false, reason: "total-too-large" });
    expect(source.readFile).not.toHaveBeenCalled();
  });
});

describe("AttachmentImporter.importPaths 的读取失败", () => {
  const getHarness = useVaultServiceHarness();

  it("读取第二个文件失败时整次都不添加, 第一个文件也没有留下", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer } = createImporter(workspace, {
      [virtualPath("甲.txt")]: { content: Buffer.from([1]) },
      [virtualPath("乙.txt")]: {
        content: Buffer.from([2]),
        readError: new Error("EIO"),
      },
    });

    const result = await importer.importPaths(workspace.entryId, [
      virtualPath("甲.txt"),
      virtualPath("乙.txt"),
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "read-failed",
      fileName: "乙.txt",
    });
    expect(listStoredAttachmentIds(workspace.vault)).toEqual({
      metadata: [],
      contents: [],
    });
  });

  it("没有这个条目时在读取内容之前失败", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { importer, source } = createImporter(workspace, {
      [virtualPath("甲.txt")]: { content: Buffer.from([1]) },
    });

    const result = await importer.importPaths("missing", [
      virtualPath("甲.txt"),
    ]);

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(source.readFile).not.toHaveBeenCalled();
  });
});
