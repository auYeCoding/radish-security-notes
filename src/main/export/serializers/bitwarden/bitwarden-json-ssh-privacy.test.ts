import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExportProgressSnapshot } from "@shared/export/export-types";

import { snapshotDatabase } from "../../../testing/database-snapshot";
import { seedBulkEntries } from "../../../testing/export-bulk-data";
import {
  createExportServiceFixture,
  exportRequestOf,
  SAMPLE_TARGET_PATH,
} from "../../../testing/export-service-fixture";
import {
  DOWNGRADED_SSH_ENTRIES,
  seedSshEntries,
  SSH_FIXTURE_PASSPHRASE,
} from "../../../testing/ssh-export-fixture";
import { SSH_PUBLIC_KEY_SAMPLES } from "../../../testing/ssh-public-key-samples";
import { useVaultDatabase } from "../../../testing/use-vault-database";

/**
 * 私钥文本里的一段, 在可观察的输出里查找私钥时用.
 */
const PRIVATE_KEY_MARKER = "c3ludGhldGlj";

/**
 * 样例公钥的 base64 数据块, 在可观察的输出里查找公钥时用.
 */
const PUBLIC_KEY_BLOBS: readonly string[] = SSH_PUBLIC_KEY_SAMPLES.map(
  (sample) => sample.line.split(" ")[1] ?? "",
);

/**
 * 被监听的控制台方法, 导出过程不应通过它们写出敏感内容.
 */
const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"] as const;

/**
 * 追加的批量登录条目个数, 超过一个分块的步数, 让导出过程至少让出一次事件循环, 才能观察到进度.
 */
const BULK_ENTRY_COUNT = 300;

/**
 * 把控制台方法换成只记录调用参数的假实现, 测试结束后由 `vi.restoreAllMocks` 还原.
 * @returns 记录到的调用参数, 随调用增长.
 */
function captureConsoleCalls(): unknown[][] {
  const calls: unknown[][] = [];
  for (const method of CONSOLE_METHODS) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });
  }
  return calls;
}

describe("Bitwarden JSON: SSH 密钥导出的结果摘要, 进度与日志", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh-privacy");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("文件里有 SSH 密钥, 但结果摘要, 进度, 失败与日志里没有私钥, 公钥与口令", async () => {
    const { orm } = getDatabase();
    seedSshEntries(orm);
    seedBulkEntries(orm, { count: BULK_ENTRY_COUNT });
    const consoleCalls = captureConsoleCalls();
    const { service, state } = createExportServiceFixture(() => orm);
    const progressSeen: ExportProgressSnapshot[] = [];
    state.onYield = () => progressSeen.push(service.getProgress());

    const result = await service.run(
      exportRequestOf({ format: "bitwardenJson" }),
    );

    const written = state.files.get(SAMPLE_TARGET_PATH)?.toString("utf8");
    expect(written).toContain(PRIVATE_KEY_MARKER);
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "saved",
        summary: {
          losses: expect.arrayContaining([
            {
              reason: "downgradedSshKeys",
              count: DOWNGRADED_SSH_ENTRIES.length,
            },
          ]),
        },
      },
    });
    expect(progressSeen.length).toBeGreaterThan(0);
    expect(state.failures).toEqual([]);
    const observable = JSON.stringify({
      result,
      progressSeen,
      dialogRequests: state.dialogRequests,
      consoleCalls,
    });
    for (const secret of [
      PRIVATE_KEY_MARKER,
      SSH_FIXTURE_PASSPHRASE,
      ...PUBLIC_KEY_BLOBS,
    ]) {
      expect(observable).not.toContain(secret);
    }
  });
});

describe("Bitwarden JSON: SSH 密钥导出对库的影响", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh-readonly");

  it("导出读取不改动库里的任何数据", async () => {
    const { orm } = getDatabase();
    seedSshEntries(orm);
    const before = snapshotDatabase(orm);
    const { service } = createExportServiceFixture(() => orm);

    await service.run(exportRequestOf({ format: "bitwardenJson" }));

    expect(snapshotDatabase(orm)).toBe(before);
  });
});
