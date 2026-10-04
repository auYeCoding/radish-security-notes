import { describe, expect, it, vi } from "vitest";

import { MAX_PREVIEW_BYTES } from "@shared/attachments/attachment-limits";

import {
  createUnlockedAttachmentFixture,
  fileOf,
} from "../testing/attachment-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { AttachmentPreviewer } from "./attachment-previewer";

describe("AttachmentPreviewer.preview", () => {
  const getHarness = useVaultServiceHarness();

  it("可预览的图片返回带 MIME 类型的 data: 地址, 解码后与内容一致", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const bytes = [137, 80, 78, 71, 13, 10, 26, 10];
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("截图 2026年.PNG", bytes),
    ]);
    const previewer = new AttachmentPreviewer(workspace.attachments);

    const result = previewer.preview("att-1");

    expect(result.ok && result.value.startsWith("data:image/png;base64,")).toBe(
      true,
    );
    expect(
      result.ok &&
        Buffer.from(result.value.split(",")[1] ?? "", "base64").equals(
          Buffer.from(bytes),
        ),
    ).toBe(true);
  });

  it("不是可预览的图片 (svg, 文本, 可执行类) 返回 not-previewable, 不读内容", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("logo.svg", 4),
      fileOf("恢复码.txt", 4),
      fileOf("setup.exe", 4),
    ]);
    const previewer = new AttachmentPreviewer(workspace.attachments);
    const read = vi.spyOn(workspace.attachments, "read");

    const results = ["att-1", "att-2", "att-3"].map((id) =>
      previewer.preview(id),
    );

    expect(results).toEqual([
      { ok: false, reason: "not-previewable" },
      { ok: false, reason: "not-previewable" },
      { ok: false, reason: "not-previewable" },
    ]);
    expect(read).not.toHaveBeenCalled();
  });
});

describe("AttachmentPreviewer.preview 的大小上限", () => {
  const getHarness = useVaultServiceHarness();

  it("超过预览大小上限的图片返回 not-previewable, 不读内容; 恰好等于上限的可以预览", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    workspace.attachments.insertAll(workspace.entryId, [
      fileOf("恰好.png", MAX_PREVIEW_BYTES),
      fileOf("过大.png", MAX_PREVIEW_BYTES + 1),
    ]);
    const previewer = new AttachmentPreviewer(workspace.attachments);

    const exact = previewer.preview("att-1");
    const read = vi.spyOn(workspace.attachments, "read");
    const over = previewer.preview("att-2");

    expect(exact.ok).toBe(true);
    expect(over).toEqual({ ok: false, reason: "not-previewable" });
    expect(read).not.toHaveBeenCalled();
  });

  it("没有这个附件时失败", async () => {
    const workspace = await createUnlockedAttachmentFixture(getHarness());
    const previewer = new AttachmentPreviewer(workspace.attachments);

    expect(previewer.preview("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
