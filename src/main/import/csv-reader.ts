import { Readable } from "node:stream";

import { CsvError, parse } from "csv-parse";

import {
  importFailed,
  importSucceeded,
  type ImportResult,
} from "@shared/import/import-result";

import type { ChunkObserver } from "./import-progress";

/**
 * 喂给解析器的每一块文本的字符数上限.
 */
const CSV_CHUNK_CHARACTERS = 64 * 1024;

/**
 * 高位代理项的编码范围起点, 块边界不能落在一对代理项中间.
 */
const HIGH_SURROGATE_START = 0xd800;

/**
 * 高位代理项的编码范围终点.
 */
const HIGH_SURROGATE_END = 0xdbff;

/**
 * CSV 里的一行数据.
 */
export interface CsvRow {
  /**
   * 各列的取值, 按列的顺序排列.
   */
  readonly values: readonly string[];
  /**
   * 这一行结束时所在的行号, 从 1 起, 引号内含换行时与物理行数不同.
   */
  readonly line: number;
}

/**
 * 解析后的 CSV: 表头与数据行.
 */
export interface CsvTable {
  /**
   * 表头里各列的名称, 区分大小写.
   */
  readonly header: readonly string[];
  /**
   * 数据行, 不含表头, 空行已跳过.
   */
  readonly rows: readonly CsvRow[];
}

/**
 * 解析器随每条记录给出的位置信息.
 */
interface ParsedInfo {
  /**
   * 记录结束时所在的行号.
   */
  readonly lines: number;
}

/**
 * 解析器产出的一条记录.
 */
interface ParsedRecord {
  /**
   * 各列的取值.
   */
  readonly record: readonly string[];
  /**
   * 位置信息.
   */
  readonly info: ParsedInfo;
}

/**
 * 判断解析器产出的东西是否是带位置信息的记录.
 * @param item 解析器产出的东西.
 * @returns 是记录时返回 true.
 */
function isParsedRecord(item: unknown): item is ParsedRecord {
  return (
    typeof item === "object" &&
    item !== null &&
    "record" in item &&
    Array.isArray(item.record) &&
    "info" in item &&
    typeof item.info === "object" &&
    item.info !== null &&
    "lines" in item.info &&
    typeof item.info.lines === "number"
  );
}

/**
 * 把文本切成大小合适的块, 块边界不落在一对代理项中间.
 * @param text 全部文本.
 * @returns 依次产出文本块.
 */
function* splitIntoChunks(text: string): Generator<string> {
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CSV_CHUNK_CHARACTERS, text.length);
    const last = text.charCodeAt(end - 1);
    if (
      end < text.length &&
      last >= HIGH_SURROGATE_START &&
      last <= HIGH_SURROGATE_END
    ) {
      end -= 1;
    }
    yield text.slice(start, end);
    start = end;
  }
}

/**
 * 读出解析器产出的全部记录, 每读一条报告一次进度.
 * @param text 文件文本.
 * @param observer 分块观察者.
 * @returns 全部记录, 第一条是表头.
 */
async function collectRecords(
  text: string,
  observer: ChunkObserver,
): Promise<ParsedRecord[]> {
  const source = Readable.from(splitIntoChunks(text), { objectMode: false });
  const parser = source.pipe(
    parse({
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      info: true,
    }),
  );
  const records: ParsedRecord[] = [];
  try {
    for await (const item of parser) {
      if (!isParsedRecord(item)) {
        throw new Error("CSV 解析器产出了未知的记录");
      }
      records.push(item);
      await observer.advance(records.length, 0);
    }
  } finally {
    source.destroy();
  }
  return records;
}

/**
 * 解析 CSV 文本: 处理 UTF-8 BOM, 双引号转义, 引号内的逗号与换行 (csv-parse 的行为, 源码证据见
 * 工单 0034 的取证记录), 第一行是表头. 列数与表头不一致的行也原样返回, 由适配器判断. 引号不闭合
 * 等结构错误整个文件失败; 解析器的错误信息里可能带字段文本, 这里只用错误代码与行号, 不外传信息.
 * @param text 文件文本.
 * @param observer 分块观察者.
 * @returns 表头与数据行; 文件结构不合法时为失败结果.
 */
export async function readCsvTable(
  text: string,
  observer: ChunkObserver,
): Promise<ImportResult<CsvTable>> {
  try {
    const [headerRecord, ...dataRecords] = await collectRecords(text, observer);
    if (headerRecord === undefined) {
      return importFailed("format-mismatch");
    }
    return importSucceeded({
      header: headerRecord.record,
      rows: dataRecords.map((item) => ({
        values: item.record,
        line: item.info.lines,
      })),
    });
  } catch (error) {
    if (error instanceof CsvError) {
      const line = typeof error.lines === "number" ? error.lines : undefined;
      return importFailed("malformed-file", line);
    }
    throw error;
  }
}

/**
 * 把一行数据按表头变成 "列名到取值" 的记录, 列名重复时取第一列.
 * @param header 表头.
 * @param row 数据行.
 * @returns 记录; 列数与表头不一致 (引号错位, 缺列, 多列) 时为 undefined.
 */
export function toRecord(
  header: readonly string[],
  row: CsvRow,
): Readonly<Record<string, string>> | undefined {
  if (row.values.length !== header.length) {
    return undefined;
  }
  return Object.fromEntries(
    header
      .filter((column, index) => header.indexOf(column) === index)
      .map((column) => [column, row.values[header.indexOf(column)]]),
  );
}

/**
 * 判断表头是否含有全部给定的列.
 * @param header 表头.
 * @param columns 必需的列名.
 * @returns 全部都有时返回 true.
 */
export function hasColumns(
  header: readonly string[],
  columns: readonly string[],
): boolean {
  return columns.every((column) => header.includes(column));
}
