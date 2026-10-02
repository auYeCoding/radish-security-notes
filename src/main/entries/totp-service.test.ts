import { describe, expect, it } from "vitest";

import { newEntryInputOf, detailOf } from "../testing/entry-service-fixture";
import {
  createTotpServiceFixture,
  createUnlockedTotpFixture,
  RFC_SHA1_SECRET,
} from "../testing/totp-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

describe("条目服务: 带 TOTP 的条目", () => {
  const getHarness = useVaultServiceHarness();

  it("详情只标明带 TOTP, 不含密钥", async () => {
    const { entries } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    const detail = entries.get("id-1");

    expect(detail).toEqual({ ok: true, value: detailOf({ hasTotp: true }) });
    expect(JSON.stringify(detail)).not.toContain(RFC_SHA1_SECRET);
  });

  it("没有填写 TOTP 的条目详情标明不带 TOTP", async () => {
    const { entries } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: "  " }));

    expect(entries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ hasTotp: false }),
    });
  });

  it("TOTP 输入不合法时新建失败, 不写入条目", async () => {
    const { entries } = await createUnlockedTotpFixture(getHarness());

    const invalid = entries.create(newEntryInputOf({ totp: "not base32!" }));
    const unsupported = entries.create(
      newEntryInputOf({
        totp: "otpauth://hotp/a?secret=JBSWY3DPEHPK3PXP&counter=1",
      }),
    );

    expect(invalid).toEqual({ ok: false, reason: "invalid-input" });
    expect(unsupported).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });
});

describe("TOTP 服务: 生成验证码", () => {
  const getHarness = useVaultServiceHarness();

  it("返回此刻的验证码, 失效时刻与周期", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(
      getHarness(),
      59000,
    );
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    expect(totp.getCode("id-1")).toEqual({
      ok: true,
      value: { code: "287082", expiresAt: 60000, periodSeconds: 30 },
    });
  });

  it("按链接里的算法, 位数与周期生成", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(
      getHarness(),
      1111111109000,
    );
    entries.create(
      newEntryInputOf({
        totp: `otpauth://totp/a?secret=${RFC_SHA1_SECRET}&digits=8&period=60`,
      }),
    );

    const result = totp.getCode("id-1");

    expect(result.ok && result.value.code).toHaveLength(8);
    expect(result.ok && result.value.periodSeconds).toBe(60);
    expect(result.ok && result.value.expiresAt % 60000).toBe(0);
  });
});

describe("TOTP 服务: 读取密钥与复制", () => {
  const getHarness = useVaultServiceHarness();

  it("读取密钥返回规范化的 Base32 文本", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(
      newEntryInputOf({ totp: "gezd gnbv gy3t qojq gezd gnbv gy3t qojq" }),
    );

    expect(totp.revealSecret("id-1")).toEqual({
      ok: true,
      value: RFC_SHA1_SECRET,
    });
  });

  it("复制验证码把此刻的验证码写入剪贴板", async () => {
    const { entries, totp, writeText } = await createUnlockedTotpFixture(
      getHarness(),
      1234567890000,
    );
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    const copied = totp.copyCode("id-1");

    expect(copied).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("005924");
  });

  it("复制密钥把 Base32 密钥写入剪贴板", async () => {
    const { entries, totp, writeText } =
      await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    const copied = totp.copySecret("id-1");

    expect(copied).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenCalledWith(RFC_SHA1_SECRET);
  });
});

describe("TOTP 服务: 失败", () => {
  const getHarness = useVaultServiceHarness();

  it("条目不带 TOTP 或没有这个编号时四个操作都是 not-found, 不写剪贴板", async () => {
    const { entries, totp, writeText } =
      await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({}));

    for (const id of ["id-1", "missing"]) {
      const results = [
        totp.getCode(id),
        totp.revealSecret(id),
        totp.copyCode(id),
        totp.copySecret(id),
      ];

      for (const result of results) {
        expect(result).toEqual({ ok: false, reason: "not-found" });
      }
    }
    expect(writeText).not.toHaveBeenCalled();
  });

  it("保险库未解锁时是 vault-locked", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { totp } = createTotpServiceFixture(vault, 59000, () => undefined);

    expect(totp.getCode("id-1")).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });

  it("数据库抛出错误时通知回调并返回意外错误", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const brokenOrm = {
      select: () => {
        throw new Error("boom");
      },
    } as unknown as VaultOrm;
    const { totp, failures } = createTotpServiceFixture(
      vault,
      59000,
      () => brokenOrm,
    );

    const result = totp.revealSecret("id-1");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(failures).toHaveLength(1);
  });
});
