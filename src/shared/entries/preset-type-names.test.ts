import { describe, expect, it } from "vitest";

import en from "../locales/en.json";
import zh from "../locales/zh.json";
import { PRESET_ENTRY_TYPES } from "./preset-entry-types";
import { PRESET_TYPE_NAMES } from "./preset-type-names";

describe("PRESET_TYPE_NAMES", () => {
  it("含每个预设类型的中文名与英文名", () => {
    expect(PRESET_TYPE_NAMES).toHaveLength(PRESET_ENTRY_TYPES.length * 2);
    for (const type of PRESET_ENTRY_TYPES) {
      expect(PRESET_TYPE_NAMES).toContain(zh.entryTypes[type.key]);
      expect(PRESET_TYPE_NAMES).toContain(en.entryTypes[type.key]);
    }
  });
});
