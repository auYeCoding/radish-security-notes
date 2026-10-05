import { describe, expect, it } from "vitest";

import {
  SAMPLE_ENTRY_IDS,
  SAMPLE_TOTP_SECRET,
} from "../../../testing/export-sample-data";
import {
  exportSampleAsNative,
  jsonAt,
  NATIVE_FULL_OPTIONS,
} from "../../../testing/native-export-fixture";
import { useVaultDatabase } from "../../../testing/use-vault-database";
import { nativeArchiveSerializer } from "./native-archive-serializer";

describe("本应用格式: 不含附件", () => {
  const getDatabase = useVaultDatabase("export-native-no-attachments");

  it("只有两个文件, 条目的附件列表为空, 清单如实标注", async () => {
    const { entries, payload, fixture, dataset } = await exportSampleAsNative(
      getDatabase().orm,
      { ...NATIVE_FULL_OPTIONS, includeAttachments: false },
    );
    expect(entries.map((entry) => entry.name)).toEqual([
      "manifest.json",
      "vault.json",
    ]);
    expect(jsonAt(entries, 0)).toMatchObject({
      includesAttachments: false,
      counts: { attachments: 0 },
    });
    expect(jsonAt(entries, 1).entries[0].attachments).toEqual([]);
    expect(payload.attachmentCount).toBe(0);
    expect(fixture.readAttachmentIds).toEqual([]);
    expect(nativeArchiveSerializer.countSteps(dataset)).toBe(8);
  });
});

describe("本应用格式: 不含保密字段", () => {
  const getDatabase = useVaultDatabase("export-native-no-secrets");

  it("文件里没有任何保密值, 清单如实标注", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm, {
      ...NATIVE_FULL_OPTIONS,
      includeSecrets: false,
    });
    const vaultText = entries[1]?.content.toString("utf8") ?? "";
    expect(jsonAt(entries, 0).includesSecrets).toBe(false);
    for (const secret of [SAMPLE_TOTP_SECRET, "forum-secret", "9527"]) {
      expect(vaultText).not.toContain(secret);
    }
    expect(jsonAt(entries, 1).entries[0].totp).toBeNull();
  });
});

describe("本应用格式: 指定条目的范围与空保险库", () => {
  const getDatabase = useVaultDatabase("export-native-selection");

  it("清单标注 selection, 只带用到的文件夹, 标签与附件", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm, {
      ...NATIVE_FULL_OPTIONS,
      scope: { kind: "entries", entryIds: [SAMPLE_ENTRY_IDS.router] },
    });
    expect(jsonAt(entries, 0)).toMatchObject({
      scope: "selection",
      counts: {
        entries: 1,
        folders: 1,
        tags: 1,
        customEntryTypes: 1,
        attachments: 1,
      },
    });
    expect(entries.map((entry) => entry.name)).toEqual([
      "manifest.json",
      "vault.json",
      "attachments/att-3",
    ]);
  });
});
