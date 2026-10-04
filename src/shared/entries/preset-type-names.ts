import en from "../locales/en.json";
import zh from "../locales/zh.json";
import { PRESET_ENTRY_TYPES } from "./preset-entry-types";

/**
 * 全部预设类型的中文名与英文名, 自定义类型的名称不能与其中任何一个同名.
 */
export const PRESET_TYPE_NAMES: readonly string[] = PRESET_ENTRY_TYPES.flatMap(
  (type) => [zh.entryTypes[type.key], en.entryTypes[type.key]],
);
