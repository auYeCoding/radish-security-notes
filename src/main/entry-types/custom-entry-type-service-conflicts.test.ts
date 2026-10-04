import { describe, expect, it } from "vitest";

import { CUSTOM_ENTRY_TYPE_MAX_COUNT } from "@shared/entries/custom-types/custom-entry-type-limits";
import type { NewCustomEntryTypeInput } from "@shared/entries/custom-types/custom-entry-type-types";
import en from "@shared/locales/en.json";
import zh from "@shared/locales/zh.json";

import {
  createCustomEntryTypeFixture,
  createUnlockedCustomEntryTypeFixture,
  simpleTypeInputOf,
} from "../testing/custom-entry-type-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 两个字段名相同, 会让字段表的主键冲突的输入: 配合恒定的编号生成函数使用.
 */
const TWO_FIELDS_INPUT: NewCustomEntryTypeInput = {
  name: "类型保密名",
  fields: [
    {
      name: "甲保密名",
      kind: "singleLine",
      isSensitive: false,
      isSummary: false,
    },
    {
      name: "乙保密名",
      kind: "singleLine",
      isSensitive: false,
      isSummary: false,
    },
  ],
};

describe("自定义类型服务: 重名", () => {
  const getHarness = useVaultServiceHarness();

  it("与已有自定义类型同名 (忽略首尾空格与英文大小写) 时被拒绝", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    customTypes.create(simpleTypeInputOf("Router"));

    expect(customTypes.create(simpleTypeInputOf(" router "))).toEqual({
      ok: false,
      reason: "name-taken",
    });
    const listed = customTypes.list();
    expect(listed.ok && listed.value).toHaveLength(1);
  });

  it("与预设类型的中文名或英文名同名时被拒绝", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    const taken = { ok: false, reason: "name-taken" };

    expect(customTypes.create(simpleTypeInputOf(zh.entryTypes.server))).toEqual(
      taken,
    );
    expect(customTypes.create(simpleTypeInputOf(en.entryTypes.server))).toEqual(
      taken,
    );
    expect(customTypes.list()).toEqual({ ok: true, value: [] });
  });

  it("不同类型的字段名可以相同", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());

    customTypes.create(simpleTypeInputOf("甲类型", "地址"));
    const second = customTypes.create(simpleTypeInputOf("乙类型", "地址"));

    expect(second.ok).toBe(true);
  });
});

describe("自定义类型服务: 个数上限", () => {
  const getHarness = useVaultServiceHarness();

  it("已有 50 个自定义类型时再新建被拒绝, 个数不变", async () => {
    const { customTypes } =
      await createUnlockedCustomEntryTypeFixture(getHarness());
    for (let index = 0; index < CUSTOM_ENTRY_TYPE_MAX_COUNT; index += 1) {
      customTypes.create(simpleTypeInputOf(`类型${index}`));
    }

    expect(customTypes.create(simpleTypeInputOf("多出来的类型"))).toEqual({
      ok: false,
      reason: "limit-reached",
    });
    const listed = customTypes.list();
    expect(listed.ok && listed.value).toHaveLength(CUSTOM_ENTRY_TYPE_MAX_COUNT);
  });
});

describe("自定义类型服务: 事务与失败", () => {
  const getHarness = useVaultServiceHarness();

  it("写入字段时失败则类型行一并回滚, 返回意外错误, 不留下半成功的类型", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { customTypes, failures } = createCustomEntryTypeFixture(vault, {
      createIdentifier: () => "same-id",
    });

    const result = customTypes.create(TWO_FIELDS_INPUT);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(customTypes.list()).toEqual({ ok: true, value: [] });
    expect(failures).toHaveLength(1);
  });

  it("失败回调里的错误不含类型名与字段名", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { customTypes, failures } = createCustomEntryTypeFixture(vault, {
      createIdentifier: () => "same-id",
    });

    customTypes.create(TWO_FIELDS_INPUT);

    const message = failures.map((error) => String(error)).join("\n");
    expect(message).not.toContain("类型保密名");
    expect(message).not.toContain("甲保密名");
    expect(message).not.toContain("乙保密名");
  });
});
