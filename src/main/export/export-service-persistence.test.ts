import { describe, expect, it } from "vitest";

import { EXPORT_FORMAT_KEYS } from "@shared/export/export-format-keys";

import { snapshotDatabase } from "../testing/database-snapshot";
import {
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_TOTP_SECRET,
  seedExportSample,
} from "../testing/export-sample-data";
import {
  createExportServiceFixture,
  exportRequestOf,
  SAMPLE_MASTER_PASSWORD,
  SAMPLE_TARGET_PATH,
  type ExportServiceFixture,
} from "../testing/export-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 写入样例并创建导出服务测试环境.
 * @param orm 已解锁数据库的查询入口.
 * @returns 导出服务测试环境.
 */
function seededFixture(orm: VaultOrm): ExportServiceFixture {
  seedExportSample(orm);
  return createExportServiceFixture(() => orm);
}

describe("导出服务: 只读", () => {
  const getDatabase = useVaultDatabase("export-service-readonly");

  it("三种格式, 含与不含保密字段, 带与不带附件, 导出前后库里全部表的内容一致", async () => {
    const { service } = seededFixture(getDatabase().orm);
    const before = snapshotDatabase(getDatabase().orm);
    for (const format of EXPORT_FORMAT_KEYS) {
      for (const includeSecrets of [true, false]) {
        for (const includeAttachments of [true, false]) {
          await service.run(
            exportRequestOf({ format, includeSecrets, includeAttachments }),
          );
        }
      }
    }
    expect(snapshotDatabase(getDatabase().orm)).toBe(before);
  });
});

describe("导出服务: 返回给渲染端的内容", () => {
  const getDatabase = useVaultDatabase("export-service-privacy");

  it("结果只有计数与标志, 不含条目内容, 文件路径与主密码", async () => {
    const { service } = seededFixture(getDatabase().orm);
    const text = JSON.stringify(await service.run(exportRequestOf()));
    for (const forbidden of [
      SAMPLE_LOGIN_PASSWORD,
      SAMPLE_TOTP_SECRET,
      "示例登录",
      "alice@example.com",
      SAMPLE_TARGET_PATH,
      "C:/exports",
      SAMPLE_MASTER_PASSWORD,
    ]) {
      expect(text).not.toContain(forbidden);
    }
    expect(JSON.stringify(service.getProgress())).not.toContain("alice");
    const scope = await service.describeScope({ kind: "all" });
    expect(JSON.stringify(scope)).not.toContain("alice");
  });

  it("失败回调收到的错误信息里没有条目内容与路径", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.failWriteAfterChunks = 0;
    await fixture.service.run(exportRequestOf());
    const messages = fixture.state.failures
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join("\n");
    expect(messages).not.toContain("alice");
    expect(messages).not.toContain(SAMPLE_TARGET_PATH);
  });
});
