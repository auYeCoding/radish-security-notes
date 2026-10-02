import { sql } from "drizzle-orm";

import type { VaultService } from "../vault/vault-service";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 恢复测试里写进数据库的标记内容, 恢复后读到它说明原数据都在.
 */
export const RECOVERY_PROBE_VALUE = "kept-after-recovery";

/**
 * 恢复测试里设置的新主密码.
 */
export const NEW_MASTER_PASSWORD = "another strong password";

/**
 * 保险库保护方式: 主密码, 或跳过后由系统保护.
 */
export type ProtectionMode = "master-password" | "system";

/**
 * 往已解锁的数据库里写一行标记数据.
 * @param service 已解锁的保险库服务.
 */
export function writeRecoveryProbe(service: VaultService): void {
  const orm = service.getOrm();
  if (orm === undefined) {
    throw new Error("测试前提不成立: 数据库应已解锁");
  }
  orm.run(sql`create table recovery_probe (value text)`);
  orm.run(sql`insert into recovery_probe values (${RECOVERY_PROBE_VALUE})`);
}

/**
 * 标记表里的一行.
 */
export interface RecoveryProbeRow {
  /**
   * 写入的标记内容.
   */
  readonly value: string;
}

/**
 * 读取标记数据.
 * @param service 已解锁的保险库服务.
 * @returns 标记表里的全部内容, 数据库未解锁时为 undefined.
 */
export function readRecoveryProbe(
  service: VaultService,
): RecoveryProbeRow[] | undefined {
  return service
    .getOrm()
    ?.all<RecoveryProbeRow>(sql`select value from recovery_probe`);
}

/**
 * 创建带标记数据的保险库, 记下设置时给出的恢复词, 然后关闭服务, 相当于设置后退出应用.
 * @param harness 测试环境.
 * @param mode 保护方式.
 * @returns 设置时给出的恢复词.
 */
export async function prepareVaultWithProbe(
  harness: VaultServiceHarness,
  mode: ProtectionMode,
): Promise<readonly string[]> {
  const service = await startService(harness);
  const result =
    mode === "master-password"
      ? await service.setupWithMasterPassword(TEST_MASTER_PASSWORD)
      : await service.setupWithoutMasterPassword();
  if (!result.ok) {
    throw new Error("测试前提不成立: 设置应当成功");
  }
  writeRecoveryProbe(service);
  service.close();
  return result.recoveryWords;
}
