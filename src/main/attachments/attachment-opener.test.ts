import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  createUnlockedAttachmentFixture,
  fileOf,
  type AttachmentWorkspaceFixture,
} from "../testing/attachment-service-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { AttachmentOpener } from "./attachment-opener";
import { NODE_TEMPORARY_COPY_FILE_SYSTEM } from "./node-attachment-file-system";
import { TemporaryCopyStore } from "./temporary-copy-store";

/**
 * 测试里的一个打开器与它的专属目录.
 */
interface OpenerFixture {
  /**
   * 被测的打开器.
   */
  readonly opener: AttachmentOpener;
  /**
   * 临时副本的专属目录路径.
   */
  readonly baseDirectory: string;
  /**
   * 创建副本或打开失败时的回调间谍.
   */
  readonly onFailure: ReturnType<typeof vi.fn>;
}

/**
 * 在附件工作环境上创建打开器, 副本的子目录编号固定为 open-1.
 * @param workspace 附件工作环境.
 * @param directory 放专属目录的临时目录.
 * @param openPath 系统打开文件的替身.
 * @returns 打开器与专属目录.
 */
function createOpener(
  workspace: AttachmentWorkspaceFixture,
  directory: string,
  openPath: (filePath: string) => Promise<string>,
): OpenerFixture {
  const baseDirectory = join(directory, "attachment-open");
  const onFailure = vi.fn();
  const copies = new TemporaryCopyStore({
    fileSystem: NODE_TEMPORARY_COPY_FILE_SYSTEM,
    baseDirectory,
    createIdentifier: () => "open-1",
    onFailure,
  });
  const opener = new AttachmentOpener({
    service: workspace.attachments,
    copies,
    shell: { openPath },
    onFailure,
  });
  return { opener, baseDirectory, onFailure };
}

describe("AttachmentOpener.open 成功", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-opener-ok");

  it("解密成专属目录下的只读副本再交给系统打开, 副本内容与附件一致", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("恢复码.txt", [1, 2, 3, 4]),
    ]);
    const openPath = vi.fn(() => Promise.resolve(""));
    const { opener, baseDirectory } = createOpener(
      workspace,
      getDirectory(),
      openPath,
    );

    const result = await opener.open("att-1");

    const expectedPath = join(baseDirectory, "open-1", "恢复码.txt");
    expect(result).toEqual({ ok: true, value: undefined });
    expect(openPath).toHaveBeenCalledWith(expectedPath);
    expect(await readFile(expectedPath)).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it("没有这个附件时失败", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const { opener } = createOpener(workspace, getDirectory(), () =>
      Promise.resolve(""),
    );

    expect(await opener.open("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("AttachmentOpener.open 被拒绝", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-opener-refuse");

  it("可执行类附件不能打开: 不读内容, 不写副本, 不交给系统", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("setup.EXE", 4),
    ]);
    const openPath = vi.fn(() => Promise.resolve(""));
    const { opener, baseDirectory } = createOpener(
      workspace,
      getDirectory(),
      openPath,
    );
    const read = vi.spyOn(workspace.attachments, "read");

    const result = await opener.open("att-1");

    expect(result).toEqual({ ok: false, reason: "not-openable" });
    expect(read).not.toHaveBeenCalled();
    expect(openPath).not.toHaveBeenCalled();
    await expect(
      readFile(join(baseDirectory, "open-1", "setup.EXE")),
    ).rejects.toThrow();
  });

  it("系统打开失败时返回 open-failed", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [fileOf("a.txt", 4)]);
    const { opener } = createOpener(workspace, getDirectory(), () =>
      Promise.resolve("没有关联的程序"),
    );

    expect(await opener.open("att-1")).toEqual({
      ok: false,
      reason: "open-failed",
    });
  });
});

describe("AttachmentOpener.open 写副本失败", () => {
  const getHarness = useVaultServiceHarness();
  const getDirectory = useTemporaryDirectory("attachment-opener-write");

  it("写副本失败时返回 write-failed 并通知回调, 不交给系统", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [fileOf("a.txt", 4)]);
    const openPath = vi.fn(() => Promise.resolve(""));
    const failure = new Error("ENOSPC");
    const onFailure = vi.fn();
    const opener = new AttachmentOpener({
      service: workspace.attachments,
      copies: new TemporaryCopyStore({
        fileSystem: {
          ...NODE_TEMPORARY_COPY_FILE_SYSTEM,
          writeFile: () => Promise.reject(failure),
        },
        baseDirectory: join(getDirectory(), "attachment-open"),
        createIdentifier: () => "open-1",
        onFailure,
      }),
      shell: { openPath },
      onFailure,
    });

    const result = await opener.open("att-1");

    expect(result).toEqual({ ok: false, reason: "write-failed" });
    expect(onFailure).toHaveBeenCalledWith(failure);
    expect(openPath).not.toHaveBeenCalled();
  });
});
