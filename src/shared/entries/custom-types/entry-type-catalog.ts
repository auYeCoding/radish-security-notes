import { searchableFieldKeysOf } from "../../search/search-fields";
import type { EntryTypeDefinition } from "../entry-field-types";
import { findEntryType, PRESET_ENTRY_TYPES } from "../preset-entry-types";
import { toEntryTypeDefinition } from "./custom-entry-type-definition";
import type { CustomEntryType } from "./custom-entry-type-types";

/**
 * 条目类型目录: 预设类型加用户的自定义类型, 按类型键统一查找. 目录是建出那一刻的快照. 主进程在
 * 一次操作开始时读库建一个, 渲染端在自定义类型变化时重建.
 */
export interface EntryTypeCatalog {
  /**
   * 全部类型, 预设在前并保持预设顺序, 自定义按创建先后接在后面.
   */
  readonly types: readonly EntryTypeDefinition[];
  /**
   * 其中的自定义类型, 先创建的在前.
   */
  readonly customTypes: readonly EntryTypeDefinition[];
  /**
   * 按类型键找类型定义.
   * @param key 预设类型键或自定义类型键.
   * @returns 类型定义, 键不属于任何类型时为 undefined.
   */
  readonly find: (key: string) => EntryTypeDefinition | undefined;
  /**
   * 按类型键取类型定义.
   * @param key 预设类型键或自定义类型键.
   * @returns 类型定义.
   * @throws Error 当键不属于任何类型时.
   */
  readonly require: (key: string) => EntryTypeDefinition;
  /**
   * 全部自定义类型里参与搜索的字段键, 不含保密字段键, 不重复.
   */
  readonly customSearchableFieldKeys: readonly string[];
}

/**
 * 由已读取的自定义类型建出类型目录.
 * @param customTypes 自定义类型, 先创建的在前.
 * @returns 类型目录.
 */
export function createEntryTypeCatalog(
  customTypes: readonly CustomEntryType[],
): EntryTypeCatalog {
  const custom = customTypes.map(toEntryTypeDefinition);
  const customByKey = new Map(custom.map((type) => [type.key, type]));
  const find = (key: string): EntryTypeDefinition | undefined =>
    findEntryType(key) ?? customByKey.get(key);
  return {
    types: [...PRESET_ENTRY_TYPES, ...custom],
    customTypes: custom,
    find,
    require: (key) => {
      const type = find(key);
      if (type === undefined) {
        throw new Error(`未知的条目类型: ${key}`);
      }
      return type;
    },
    customSearchableFieldKeys: Array.from(
      new Set(custom.flatMap(searchableFieldKeysOf)),
    ),
  };
}
