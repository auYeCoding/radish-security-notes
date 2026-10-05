import { describe, expect, it } from "vitest";

import {
  IMPORT_SOURCE_KEYS,
  type ImportSourceKey,
} from "@shared/import/import-source-keys";

import {
  createDefaultSourceRegistry,
  DEFAULT_SOURCE_ADAPTERS,
} from "./default-source-registry";
import { createSourceRegistry, type SourceRegistry } from "./source-registry";

/**
 * 找出登记表里没有登记键相同的适配器的来源键.
 * @param registry 待检查的登记表.
 * @param keys 必须登记适配器的来源键.
 * @returns 缺少适配器的来源键, 登记齐全时为空数组.
 */
function findUnregisteredKeys(
  registry: SourceRegistry,
  keys: readonly ImportSourceKey[],
): ImportSourceKey[] {
  return keys.filter((key) => registry.find(key)?.key !== key);
}

describe("默认来源登记表", () => {
  it("每个来源键都登记了键相同的适配器", () => {
    expect(
      findUnregisteredKeys(createDefaultSourceRegistry(), IMPORT_SOURCE_KEYS),
    ).toEqual([]);
  });

  it("适配器组与来源键一一对应, 没有多余的适配器", () => {
    const adapterKeys = DEFAULT_SOURCE_ADAPTERS.map((adapter) => adapter.key);
    expect([...adapterKeys].sort()).toEqual([...IMPORT_SOURCE_KEYS].sort());
  });

  it("缺少适配器的来源键会被检出", () => {
    const onlyJson = createSourceRegistry(
      DEFAULT_SOURCE_ADAPTERS.filter(
        (adapter) => adapter.key === "bitwardenJson",
      ),
    );
    expect(
      findUnregisteredKeys(onlyJson, ["bitwardenJson", "bitwardenCsv"]),
    ).toEqual(["bitwardenCsv"]);
  });
});
