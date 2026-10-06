import { describe, expect, it } from "vitest";

import type { NativeManifest } from "../export/serializers/native/native-format-types";
import {
  loadSampleBackup,
  type SampleBackup,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { RestoreVaultDocument } from "./restore-backup-types";
import { parseVaultDocument } from "./restore-document-parser";
import {
  checkManifestCounts,
  parseManifest,
} from "./restore-manifest-validator";

/**
 * 解析好的清单与保险库数据.
 */
interface ParsedSample {
  /**
   * 清单.
   */
  readonly manifest: NativeManifest;
  /**
   * 保险库数据.
   */
  readonly document: RestoreVaultDocument;
}

/**
 * 把值写成字节.
 * @param value 要写的值.
 * @returns JSON 字节.
 */
function bytesOf(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

/**
 * 解析样本里的清单与保险库数据, 要求都成功.
 * @param backup 备份样本.
 * @returns 清单与保险库数据.
 * @throws Error 当解析失败时.
 */
function parsedSample(backup: SampleBackup): ParsedSample {
  const manifest = parseManifest(bytesOf(backup.manifest));
  const document = parseVaultDocument(bytesOf(backup.vault));
  if (!manifest.ok || !document.ok) {
    throw new Error("样本应当解析成功");
  }
  return { manifest: manifest.value, document: document.value };
}

describe("清单校验: 合规与不是备份文件", () => {
  const getDatabase = useVaultDatabase("restore-manifest-valid");

  it("真实导出的清单通过, 读出各项", async () => {
    const { manifest } = await loadSampleBackup(getDatabase().orm);

    expect(parseManifest(bytesOf(manifest))).toMatchObject({
      ok: true,
      value: {
        format: "radish-security-notes-export",
        version: 1,
        scope: "all",
        includesSecrets: true,
        includesAttachments: true,
        counts: { entries: 8, folders: 3, attachments: 3 },
      },
    });
  });

  it("不是 JSON, 不是对象或格式标识不符就不是本应用的备份文件", async () => {
    const { manifest } = await loadSampleBackup(getDatabase().orm);
    const wrong = { ...manifest, format: "other-app" };

    for (const bytes of [
      Buffer.from("not json"),
      bytesOf([]),
      bytesOf(wrong),
    ]) {
      expect(parseManifest(bytes)).toEqual({
        ok: false,
        reason: "not-a-backup",
      });
    }
  });
});

describe("清单校验: 版本", () => {
  const getDatabase = useVaultDatabase("restore-manifest-version");

  it("版本比当前更新提示备份来自更新版本的应用", async () => {
    const { manifest } = await loadSampleBackup(getDatabase().orm);

    for (const version of [2, 99]) {
      expect(parseManifest(bytesOf({ ...manifest, version }))).toEqual({
        ok: false,
        reason: "newer-version",
      });
    }
  });

  it("版本不是 1 的整数时是内容不合规", async () => {
    const { manifest } = await loadSampleBackup(getDatabase().orm);

    for (const version of [0, -1, 1.5, "1", null]) {
      expect(parseManifest(bytesOf({ ...manifest, version }))).toEqual({
        ok: false,
        reason: "invalid-content",
        problem: { section: "manifest", code: "wrong-shape" },
      });
    }
  });
});

describe("清单校验: 结构与时间", () => {
  const getDatabase = useVaultDatabase("restore-manifest-shape");

  it("缺项, 类型不对或计数为负时是内容不合规", async () => {
    const { manifest } = await loadSampleBackup(getDatabase().orm);
    const counts = { ...manifest.counts, entries: -1 };

    for (const broken of [
      { ...manifest, scope: "some" },
      { ...manifest, includesSecrets: "yes" },
      { ...manifest, counts },
      { ...manifest, counts: undefined },
    ]) {
      expect(parseManifest(bytesOf(broken))).toMatchObject({
        reason: "invalid-content",
        problem: { section: "manifest", code: "wrong-shape" },
      });
    }
  });

  it("生成时间不是合法的时间文本时是内容不合规", async () => {
    const { manifest } = await loadSampleBackup(getDatabase().orm);

    expect(
      parseManifest(bytesOf({ ...manifest, createdAt: "yesterday" })),
    ).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "manifest", code: "invalid-value" },
    });
  });
});

describe("清单计数与保险库数据核对", () => {
  const getDatabase = useVaultDatabase("restore-manifest-counts");

  it("计数一致时没有问题", async () => {
    const { manifest, document } = parsedSample(
      await loadSampleBackup(getDatabase().orm),
    );

    expect(checkManifestCounts(manifest, document)).toBeUndefined();
  });

  it("任何一项计数与实际不符都是计数不符", async () => {
    const { manifest, document } = parsedSample(
      await loadSampleBackup(getDatabase().orm),
    );

    for (const key of [
      "entries",
      "folders",
      "tags",
      "customEntryTypes",
      "attachments",
    ] as const) {
      const counts = { ...manifest.counts, [key]: manifest.counts[key] + 1 };

      expect(checkManifestCounts({ ...manifest, counts }, document)).toEqual({
        section: "manifest",
        code: "count-mismatch",
      });
    }
  });
});

describe("清单声明与附件的一致性", () => {
  const getDatabase = useVaultDatabase("restore-manifest-attachments");

  it("清单说不含附件, 条目却声明了附件时是取值不合规", async () => {
    const { manifest, document } = parsedSample(
      await loadSampleBackup(getDatabase().orm),
    );

    expect(
      checkManifestCounts(
        { ...manifest, includesAttachments: false },
        document,
      ),
    ).toEqual({ section: "manifest", code: "invalid-value" });
  });
});
