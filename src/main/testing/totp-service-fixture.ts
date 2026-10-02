import { vi } from "vitest";

import type { ClipboardPort } from "../entries/clipboard-port";
import type { EntryService } from "../entries/entry-service";
import { TotpService } from "../entries/totp-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import { createEntryServiceFixture } from "./entry-service-fixture";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * RFC 6238 附录 B 的 SHA1 种子 12345678901234567890 的 Base32 形式, 测试里作为 TOTP 密钥.
 */
export const RFC_SHA1_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

/**
 * 测试里的一次 TOTP 服务环境.
 */
export interface TotpServiceFixture {
  /**
   * 用来新建条目的条目服务, 与 TOTP 服务读写同一个数据库.
   */
  readonly entries: EntryService;
  /**
   * 被测的 TOTP 服务.
   */
  readonly totp: TotpService;
  /**
   * 假剪贴板写入方法的间谍.
   */
  readonly writeText: ReturnType<typeof vi.fn<(text: string) => void>>;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 在保险库服务之上创建 TOTP 服务与条目服务.
 * @param vault 保险库服务.
 * @param now 服务读到的当前时间, 毫秒时间戳, 默认是 RFC 附录 B 的第一个时刻 59 秒.
 * @param getOrm 覆盖 TOTP 服务取数据库的方法, 默认取保险库服务的数据库.
 * @returns TOTP 服务环境.
 */
export function createTotpServiceFixture(
  vault: VaultService,
  now = 59000,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): TotpServiceFixture {
  const writeText = vi.fn<(text: string) => void>();
  const clipboard: ClipboardPort = { writeText };
  const failures: unknown[] = [];
  const totp = new TotpService({
    getOrm,
    clipboard,
    now: () => now,
    onFailure: (error) => failures.push(error),
  });
  const { entries } = createEntryServiceFixture(vault);
  return { entries, totp, writeText, failures };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建 TOTP 服务环境.
 * @param harness 保险库服务测试环境.
 * @param now 服务读到的当前时间, 毫秒时间戳.
 * @returns TOTP 服务环境.
 */
export async function createUnlockedTotpFixture(
  harness: VaultServiceHarness,
  now?: number,
): Promise<TotpServiceFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createTotpServiceFixture(vault, now);
}
