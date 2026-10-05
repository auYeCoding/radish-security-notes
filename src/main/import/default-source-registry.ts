import { bitwardenCsvAdapter } from "./adapters/bitwarden-csv-adapter";
import { bitwardenJsonAdapter } from "./adapters/bitwarden-json-adapter";
import { browserCsvAdapter } from "./adapters/browser-csv-adapter";
import { keepassxcCsvAdapter } from "./adapters/keepassxc-csv-adapter";
import type { ImportSourceAdapter } from "./source-adapter";
import { createSourceRegistry, type SourceRegistry } from "./source-registry";

/**
 * 应用支持的全部来源适配器. 新增来源时新增适配器模块, 并把它加进这一组, 既有适配器不用改.
 */
export const DEFAULT_SOURCE_ADAPTERS: readonly ImportSourceAdapter[] = [
  bitwardenJsonAdapter,
  bitwardenCsvAdapter,
  browserCsvAdapter,
  keepassxcCsvAdapter,
];

/**
 * 用应用支持的全部来源适配器创建登记表.
 * @returns 登记表.
 */
export function createDefaultSourceRegistry(): SourceRegistry {
  return createSourceRegistry(DEFAULT_SOURCE_ADAPTERS);
}
