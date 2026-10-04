import { useMemo } from "react";

import {
  createEntryTypeCatalog,
  type EntryTypeCatalog,
} from "@shared/entries/custom-types/entry-type-catalog";

import { useEntryTypeStore } from "./use-entry-type-store";

/**
 * 读取条目类型目录: 预设类型加用户的自定义类型. 自定义类型变化时重新建目录, 其余时候返回同一个
 * 目录.
 * @returns 类型目录.
 */
export function useEntryTypeCatalog(): EntryTypeCatalog {
  const customTypes = useEntryTypeStore((state) => state.customTypes);
  return useMemo(() => createEntryTypeCatalog(customTypes), [customTypes]);
}
