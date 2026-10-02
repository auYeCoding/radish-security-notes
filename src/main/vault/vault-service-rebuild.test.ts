import { rm, writeFile } from "node:fs/promises";

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
import { createFakeSafeStorage } from "../testing/vault-test-fixtures";

describe("VaultService 密钥文件丢失后重建", () => {
  const getHarness = useVaultServiceHarness();

  it("主密码路线: 密钥文件丢失是 failed, 凭词重建后设置新主密码", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    await rm(harness.paths.keyFile);
    const service = await startService(harness);
    expect(service.getStatus()).toBe("failed");

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );
    service.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect(restarted.getStatus()).toBe("locked");
    expect(await restarted.unlock(NEW_MASTER_PASSWORD)).toEqual({ ok: true });
    expect(readRecoveryProbe(restarted)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });

  it("跳过路线: 密钥文件丢失后凭词重建并继续用系统保护", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    await rm(harness.paths.keyFile);
    const service = await startService(harness);
    expect(service.getStatus()).toBe("failed");

    const result = await service.restoreWithoutMasterPassword(words);
    service.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect(restarted.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(restarted)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });

  it("密钥文件损坏时同样能重建", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    await writeFile(harness.paths.keyFile, "{broken", "utf8");
    const service = await startService(harness);
    expect(service.getStatus()).toBe("failed");

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
  });
});

describe("VaultService 跳过模式系统密钥失效后重建", () => {
  const getHarness = useVaultServiceHarness();

  it("系统解不开数据密钥是 failed, 凭词改设新主密码后解锁", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness, {
      safeStorage: createFakeSafeStorage({ isDecryptionFailing: true }),
    });
    expect(service.getStatus()).toBe("failed");

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });

  it("系统解不开数据密钥时凭词重新交给系统保护", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness, {
      safeStorage: createFakeSafeStorage({ isDecryptionFailing: true }),
    });

    const result = await service.restoreWithoutMasterPassword(words);
    service.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect(restarted.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(restarted)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });
});
