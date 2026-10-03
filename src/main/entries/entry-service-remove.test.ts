import { describe, expect, it } from "vitest";

import {
  createEntryServiceFixture,
  createUnlockedEntryFixture,
  newEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";

describe("条目服务: 删除", () => {
  const getHarness = useVaultServiceHarness();

  it("未解锁时因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { entries } = createEntryServiceFixture(vault);

    expect(entries.remove("id-1")).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });

  it("删除后条目从列表消失, 读取与复制都返回未找到, 其它条目不受影响", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        name: "甲",
        fields: { account: "a1", password: "p1", url: "" },
        customFields: [{ label: "字段", value: "值", isHidden: false }],
      }),
    );
    entries.create(newEntryInputOf({ name: "乙" }));

    const removed = entries.remove("id-1");

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(entries.list()).toEqual({
      ok: true,
      value: [{ id: "id-3", name: "乙", type: "login", account: "" }],
    });
    const notFound = { ok: false, reason: "not-found" };
    expect(entries.get("id-1")).toEqual(notFound);
    expect(entries.copyField("id-1", "password")).toEqual(notFound);
    expect(entries.copyCustomField("id-1", "id-2")).toEqual(notFound);
    expect(entries.get("id-3")).toMatchObject({ ok: true });
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("条目服务: 删除的边界", () => {
  const getHarness = useVaultServiceHarness();

  it("没有这个编号或已经删除过时返回未找到", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf());

    const first = entries.remove("id-1");
    const second = entries.remove("id-1");
    const missing = entries.remove("missing");

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: "not-found" });
    expect(missing).toEqual({ ok: false, reason: "not-found" });
  });

  it("删除全部条目后列表为空", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf());

    entries.remove("id-1");

    expect(entries.list()).toEqual({ ok: true, value: [] });
  });
});
