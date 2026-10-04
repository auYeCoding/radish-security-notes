import { describe, expect, it } from "vitest";

import {
  createRouterTypeFixture,
  OVERLONG_SUMMARY_VALUE,
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
  routerEntryInputOf,
} from "../testing/custom-type-entry-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

/**
 * 条目服务因输入不合规而返回的失败结果.
 */
const INVALID = { ok: false, reason: "invalid-input" };

describe("条目服务: 自定义类型条目的类型键与字段", () => {
  const getHarness = useVaultServiceHarness();

  it("类型键不属于任何类型时被拒绝, 不写入", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    expect(entries.create(routerEntryInputOf({ type: "custom:none" }))).toEqual(
      INVALID,
    );
    expect(entries.create(routerEntryInputOf({ type: "unknown" }))).toEqual(
      INVALID,
    );
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });

  it("类型字段缺项时被拒绝", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    expect(
      entries.create(routerEntryInputOf({ fields: { account: "a" } })),
    ).toEqual(INVALID);
  });

  it("借用别的类型的字段键时被拒绝", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    expect(
      entries.create(
        routerEntryInputOf({
          fields: { password: "p", url: "", account: "a" },
        }),
      ),
    ).toEqual(INVALID);
  });

  it("类型之外多余的键被丢弃", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    const created = entries.create(
      routerEntryInputOf({
        fields: {
          account: "a",
          [ROUTER_SECRET_FIELD_KEY]: "s",
          [ROUTER_NOTE_FIELD_KEY]: "n",
          password: "dropped",
        },
      }),
    );

    expect(created.ok && Object.keys(created.value.fields)).toEqual([
      "account",
      ROUTER_SECRET_FIELD_KEY,
      ROUTER_NOTE_FIELD_KEY,
    ]);
  });
});

describe("条目服务: 自定义类型条目的长度上限", () => {
  const getHarness = useVaultServiceHarness();

  it("摘要字段的值超过账号长度上限时被拒绝", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    expect(
      entries.create(
        routerEntryInputOf({
          fields: {
            account: OVERLONG_SUMMARY_VALUE,
            [ROUTER_SECRET_FIELD_KEY]: "",
            [ROUTER_NOTE_FIELD_KEY]: "",
          },
        }),
      ),
    ).toEqual(INVALID);
  });

  it("保密字段不设长度上限", async () => {
    const { entries } = await createRouterTypeFixture(getHarness());

    const created = entries.create(
      routerEntryInputOf({
        fields: {
          account: "a",
          [ROUTER_SECRET_FIELD_KEY]: "s".repeat(5000),
          [ROUTER_NOTE_FIELD_KEY]: "",
        },
      }),
    );

    expect(created.ok).toBe(true);
  });
});
