import {
  importFailed,
  importSucceeded,
  type ImportFailureReason,
} from "@shared/import/import-result";
import type { NotImportedItem } from "@shared/import/import-reasons";
import type { ImportSourceKey } from "@shared/import/import-source-keys";

import { hasColumns, readCsvTable, toRecord } from "./csv-reader";
import type { ChunkObserver } from "./import-progress";
import type {
  ImportedEntryDraft,
  ImportSourceAdapter,
  SourceParseResult,
} from "./source-adapter";

/**
 * 出现了就说明文件不是这种格式能处理的导出的列, 例如组织库导出.
 */
export interface RejectedColumn {
  /**
   * 列名.
   */
  readonly column: string;
  /**
   * 出现这一列时整个文件失败的原因.
   */
  readonly reason: ImportFailureReason;
}

/**
 * 一种 CSV 来源格式的定义: 适配器只需说明认哪些列, 以及怎样把一行变成草稿.
 */
export interface CsvAdapterDefinition {
  /**
   * 适配器处理的来源与文件格式.
   */
  readonly key: ImportSourceKey;
  /**
   * 表头里必须有的列, 列名区分大小写, 缺了说明文件不是这种格式.
   */
  readonly requiredColumns: readonly string[];
  /**
   * 表头里不能有的列.
   */
  readonly rejectedColumns?: readonly RejectedColumn[];
  /**
   * 把一行记录映射成草稿.
   */
  readonly mapRecord: (
    record: Readonly<Record<string, string>>,
  ) => ImportedEntryDraft;
}

/**
 * 在表头里找出现了的不支持的列.
 * @param header 表头.
 * @param rejected 不支持的列的定义.
 * @returns 第一个出现了的不支持的列, 没有时为 undefined.
 */
function findRejectedColumn(
  header: readonly string[],
  rejected: readonly RejectedColumn[],
): RejectedColumn | undefined {
  return rejected.find((candidate) => header.includes(candidate.column));
}

/**
 * 按定义创建 CSV 来源的适配器: 读出表格, 检查表头, 逐行映射成草稿, 列数与表头不一致的行记入
 * 没能解析的行而不是猜测列的归属 (引号错位会让密码等字段串列). 每个来源仍是独立的适配器模块,
 * 这里只是它们共用的行处理流程.
 * @param definition 来源格式的定义.
 * @returns 适配器.
 */
export function createCsvAdapter(
  definition: CsvAdapterDefinition,
): ImportSourceAdapter {
  return {
    key: definition.key,
    parse: async (
      text: string,
      observer: ChunkObserver,
    ): Promise<SourceParseResult> => {
      const table = await readCsvTable(text, observer);
      if (!table.ok) {
        return table;
      }
      const { header, rows } = table.value;
      const rejected = findRejectedColumn(
        header,
        definition.rejectedColumns ?? [],
      );
      if (rejected !== undefined) {
        return importFailed(rejected.reason);
      }
      if (!hasColumns(header, definition.requiredColumns)) {
        return importFailed("format-mismatch");
      }
      const drafts: ImportedEntryDraft[] = [];
      const notImported: NotImportedItem[] = [];
      for (const [index, row] of rows.entries()) {
        const record = toRecord(header, row);
        if (record === undefined) {
          notImported.push({
            scope: "row",
            name: String(row.line),
            reason: "row-malformed",
          });
        } else {
          drafts.push(definition.mapRecord(record));
        }
        await observer.advance(index + 1, rows.length);
      }
      return importSucceeded({ drafts, notImported });
    },
  };
}
