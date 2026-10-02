import { describe, expect, it } from "vitest";

import {
  NEW_MASTER_PASSWORD,
  RECOVERY_PROBE_VALUE,
  prepareVaultWithProbe,
  readRecoveryProbe,
} from "../testing/recovery-vault-fixtures";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

describe("VaultService 忘记主密码后凭词恢复", () => {
  const getHarness = useVaultServiceHarness();

  it("校验通过不改动密钥文件与状态", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const recordBefore = await harness.keyFileStore.read();
    const service = await startService(harness);

    const result = await service.verifyRecoveryWords(words);

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("locked");
    expect(await harness.keyFileStore.read()).toEqual(recordBefore);
  });

  it("设置新主密码后解锁, 原数据都在, 旧主密码失效", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );
    service.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect(restarted.getStatus()).toBe("locked");
    expect(await restarted.unlock(TEST_MASTER_PASSWORD)).toEqual({
      ok: false,
      reason: "wrong-password",
    });
    expect(await restarted.unlock(NEW_MASTER_PASSWORD)).toEqual({ ok: true });
    expect(readRecoveryProbe(restarted)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });

  it("恢复成功后当场已解锁, 原数据都在", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);

    await service.restoreWithMasterPassword(words, NEW_MASTER_PASSWORD);

    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });
});

describe("VaultService 恢复后的状态", () => {
  const getHarness = useVaultServiceHarness();

  it("恢复后原来的词仍然有效", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const first = await startService(harness);
    await first.restoreWithMasterPassword(words, NEW_MASTER_PASSWORD);
    first.close();

    const second = await startService(harness);

    expect(await second.verifyRecoveryWords(words)).toEqual({ ok: true });
  });
});

describe("VaultService 忘记主密码后恢复并改用系统保护", () => {
  const getHarness = useVaultServiceHarness();

  it("密钥文件改成系统保护, 重启后直接解锁, 原数据都在", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);

    const result = await service.restoreWithoutMasterPassword(words);
    service.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect((await harness.keyFileStore.read())?.protection).toBe(
      "system-protected",
    );
    expect(restarted.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(restarted)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });
});
