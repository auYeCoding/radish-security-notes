import { describe, expect, it } from "vitest";

import {
  detailOf,
  newEntryInputOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  createUnlockedTotpFixture,
  RFC_SHA1_SECRET,
} from "../testing/totp-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

/**
 * 另一个密钥, 与 RFC 附录 B 的种子不同.
 */
const OTHER_SECRET = "JBSWY3DPEHPK3PXP";

/**
 * 带非默认算法, 位数与周期的 otpauth 链接.
 */
const CUSTOM_PARAMETER_LINK = `otpauth://totp/a?secret=${RFC_SHA1_SECRET}&algorithm=SHA256&digits=8&period=60`;

/**
 * 找不到时的失败结果.
 */
const NOT_FOUND = { ok: false, reason: "not-found" };

describe("编辑条目: TOTP 保持", () => {
  const getHarness = useVaultServiceHarness();

  it("TOTP 输入留空且不移除时, 密钥, 算法, 位数与周期都保持不变", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(
      getHarness(),
      1111111109000,
    );
    entries.create(newEntryInputOf({ totp: CUSTOM_PARAMETER_LINK }));
    const before = totp.getCode("id-1");

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({ name: "改名", totp: "" }),
    );

    expect(updated).toEqual({
      ok: true,
      value: detailOf({ name: "改名", hasTotp: true }),
    });
    expect(totp.getCode("id-1")).toEqual(before);
    expect(totp.getCode("id-1")).toMatchObject({
      ok: true,
      value: { periodSeconds: 60 },
    });
    expect(totp.revealSecret("id-1")).toEqual({
      ok: true,
      value: RFC_SHA1_SECRET,
    });
  });

  it("本来不带 TOTP 的条目, 输入留空时仍不带 TOTP", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf());

    const updated = entries.update("id-1", updateEntryInputOf());

    expect(updated).toEqual({ ok: true, value: detailOf({ hasTotp: false }) });
    expect(totp.getCode("id-1")).toEqual(NOT_FOUND);
  });
});

describe("编辑条目: TOTP 替换与添加", () => {
  const getHarness = useVaultServiceHarness();

  it("填入新密钥后验证码按新密钥生成", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));
    const before = totp.getCode("id-1");

    entries.update("id-1", updateEntryInputOf({ totp: OTHER_SECRET }));

    expect(totp.revealSecret("id-1")).toEqual({
      ok: true,
      value: OTHER_SECRET,
    });
    expect(totp.getCode("id-1")).not.toEqual(before);
  });

  it("填入新链接后换成链接里的算法, 位数与周期", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    entries.update("id-1", updateEntryInputOf({ totp: CUSTOM_PARAMETER_LINK }));

    expect(totp.getCode("id-1")).toMatchObject({
      ok: true,
      value: { periodSeconds: 60 },
    });
  });

  it("本来不带 TOTP 的条目可以添加 TOTP", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf());

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({ totp: RFC_SHA1_SECRET }),
    );

    expect(updated).toEqual({ ok: true, value: detailOf({ hasTotp: true }) });
    expect(totp.getCode("id-1")).toMatchObject({ ok: true });
  });

  it("新输入不合法时被拒绝, 原有 TOTP 不变", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    const invalid = entries.update(
      "id-1",
      updateEntryInputOf({ name: "不会保存", totp: "not base32!" }),
    );

    expect(invalid).toEqual({ ok: false, reason: "invalid-input" });
    expect(totp.revealSecret("id-1")).toEqual({
      ok: true,
      value: RFC_SHA1_SECRET,
    });
    expect(entries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ hasTotp: true }),
    });
  });
});

describe("编辑条目: TOTP 移除", () => {
  const getHarness = useVaultServiceHarness();

  it("移除后条目不再带 TOTP, 验证码, 密钥与复制都返回未找到", async () => {
    const { entries, totp, writeText } =
      await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({ removeTotp: true }),
    );

    expect(updated).toEqual({ ok: true, value: detailOf({ hasTotp: false }) });
    expect(totp.getCode("id-1")).toEqual(NOT_FOUND);
    expect(totp.revealSecret("id-1")).toEqual(NOT_FOUND);
    expect(totp.copyCode("id-1")).toEqual(NOT_FOUND);
    expect(totp.copySecret("id-1")).toEqual(NOT_FOUND);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("要求移除时优先于输入框里的内容", async () => {
    const { entries, totp } = await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    entries.update(
      "id-1",
      updateEntryInputOf({ removeTotp: true, totp: OTHER_SECRET }),
    );

    expect(totp.getCode("id-1")).toEqual(NOT_FOUND);
  });
});

describe("编辑后复制与删除后的 TOTP", () => {
  const getHarness = useVaultServiceHarness();

  it("编辑其它内容后复制验证码与密钥仍由主进程写入剪贴板且值正确", async () => {
    const { entries, totp, writeText } = await createUnlockedTotpFixture(
      getHarness(),
      59000,
    );
    entries.create(
      newEntryInputOf({
        fields: { account: "old", password: "old-p", url: "" },
        totp: RFC_SHA1_SECRET,
      }),
    );

    entries.update(
      "id-1",
      updateEntryInputOf({
        fields: { account: "new", password: "new-p", url: "" },
      }),
    );
    totp.copyCode("id-1");
    totp.copySecret("id-1");

    expect(writeText.mock.calls.map(([text]) => text)).toEqual([
      "287082",
      RFC_SHA1_SECRET,
    ]);
  });

  it("删除条目后验证码, 密钥与复制都不再响应", async () => {
    const { entries, totp, writeText } =
      await createUnlockedTotpFixture(getHarness());
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));

    entries.remove("id-1");

    expect(totp.getCode("id-1")).toEqual(NOT_FOUND);
    expect(totp.revealSecret("id-1")).toEqual(NOT_FOUND);
    expect(totp.copyCode("id-1")).toEqual(NOT_FOUND);
    expect(totp.copySecret("id-1")).toEqual(NOT_FOUND);
    expect(writeText).not.toHaveBeenCalled();
  });
});
