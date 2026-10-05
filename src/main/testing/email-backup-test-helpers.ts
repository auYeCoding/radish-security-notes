import { randomBytes } from "node:crypto";
import { readdir } from "node:fs/promises";

import type { EmailBackupRunRequest } from "@shared/email-backup/email-backup-result";

import { insertEntry } from "../entries/entry-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  savedSettingsInput,
  type EmailBackupFixture,
} from "./email-backup-fixture";

/**
 * 立即备份的默认请求: 带附件, 不带主密码.
 */
export const RUN_WITH_ATTACHMENTS: EmailBackupRunRequest = {
  withoutAttachments: false,
};

/**
 * 不加密并已确认明文风险的设置覆盖项, 测试里省去口令加密的耗时.
 */
export const PLAINTEXT_SETTINGS = {
  isEncrypted: false,
  hasAcknowledgedPlaintextRisk: true,
} as const;

/**
 * 保存一份合规的设置, 失败时抛错.
 * @param fixture 测试环境.
 * @param overrides 要覆盖的设置字段.
 * @returns 保存之后兑现.
 */
export async function saveSettings(
  fixture: EmailBackupFixture,
  overrides: Parameters<typeof savedSettingsInput>[0] = {},
): Promise<void> {
  const result = await fixture.service.saveSettings(
    savedSettingsInput(overrides),
  );
  if (!result.ok) {
    throw new Error(`保存设置失败: ${result.reason}`);
  }
}

/**
 * 备份临时目录里现在有哪些文件, 目录还不存在时视为没有.
 * @param fixture 测试环境.
 * @returns 文件名列表.
 */
export async function leftoverFiles(
  fixture: EmailBackupFixture,
): Promise<string[]> {
  return readdir(fixture.temporaryDirectory).catch(() => []);
}

/**
 * 备注的字节数, 随机内容 base64 之后压缩不下去, 让不含附件的备份也超出 1 MB.
 */
const LARGE_NOTES_BYTES = 1_600_000;

/**
 * 写入一个备注很大且不可压缩的条目.
 * @param orm 已解锁数据库的查询入口.
 */
export function seedLargeNotes(orm: VaultOrm): void {
  insertEntry(orm, {
    id: "large-notes",
    name: "大备注",
    type: "login",
    fields: { account: "a", password: "b", url: "" },
    notes: randomBytes(LARGE_NOTES_BYTES).toString("base64"),
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: null,
    createdAt: 1,
  });
}
