import { describe, expect, it } from "vitest";

import { EXPORT_FORMAT_KEYS } from "@shared/export/export-format-keys";

import { createDefaultExportSerializerRegistry } from "./default-serializer-registry";
import { createExportSerializerRegistry } from "./export-serializer-registry";
import { nativeArchiveSerializer } from "./native/native-archive-serializer";

describe("导出序列化器登记表", () => {
  it("默认登记了每一种导出格式, 序列化器的键与格式键一致", () => {
    const registry = createDefaultExportSerializerRegistry();
    for (const key of EXPORT_FORMAT_KEYS) {
      expect(registry.require(key).key).toBe(key);
    }
  });

  it("同一个格式登记两次时报错", () => {
    expect(() =>
      createExportSerializerRegistry([
        nativeArchiveSerializer,
        nativeArchiveSerializer,
      ]),
    ).toThrow("导出序列化器重复登记");
  });

  it("取没有登记的格式时报错", () => {
    const registry = createExportSerializerRegistry([nativeArchiveSerializer]);
    expect(() => registry.require("browserCsv")).toThrow("未登记的导出格式");
  });
});
