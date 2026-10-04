import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { insertEntry, listEntrySummaries } from "../entries/entry-repository";
import { searchEntries } from "../entries/entry-search";
import { searchRecordOf } from "../testing/search-record-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { insertAttachmentContent } from "./attachment-content-repository";
import { insertAttachmentRow } from "./attachment-repository";

/**
 * 性能测试用的条目个数.
 */
const ENTRY_COUNT = 5000;

/**
 * 每个条目附件内容的字节数.
 */
const ATTACHMENT_BYTES = 4096;

/**
 * 重复测量的次数, 取中位数, 减少偶发抖动的影响.
 */
const MEASUREMENT_ROUNDS = 7;

/**
 * 允许的耗时上限, 单位毫秒. 远高于实测值, 只防止列表与搜索被附件拖慢到明显的量级.
 */
const MAX_ALLOWED_MILLISECONDS = 1000;

/**
 * 写入测试库: 5000 个条目, 可选地给每个条目一个 4 KiB 的附件.
 * @param orm 已解锁数据库的查询入口.
 * @param hasAttachments 是否给每个条目写入附件.
 */
function seedEntries(orm: VaultOrm, hasAttachments: boolean): void {
  orm.transaction((transaction) => {
    for (let index = 0; index < ENTRY_COUNT; index += 1) {
      const id = `entry-${index}`;
      insertEntry(transaction, searchRecordOf(id));
      if (hasAttachments) {
        insertAttachmentRow(transaction, {
          id: `att-${index}`,
          entryId: id,
          name: `附件-${index}.bin`,
          size: ATTACHMENT_BYTES,
          position: 0,
        });
        insertAttachmentContent(
          transaction,
          `att-${index}`,
          Buffer.alloc(ATTACHMENT_BYTES, index % 256),
        );
      }
    }
  });
}

/**
 * 测量一次操作的耗时.
 * @param operation 要测量的操作.
 * @returns 耗时, 单位毫秒.
 */
function measureOnce(operation: () => unknown): number {
  const start = performance.now();
  operation();
  return performance.now() - start;
}

/**
 * 重复测量一个操作, 取耗时的中位数.
 * @param operation 要测量的操作.
 * @returns 中位数, 单位毫秒.
 */
function measureMedian(operation: () => unknown): number {
  measureOnce(operation);
  const durations = Array.from({ length: MEASUREMENT_ROUNDS }, () =>
    measureOnce(operation),
  );
  return [...durations].sort((first, second) => first - second)[
    Math.floor(durations.length / 2)
  ];
}

describe("条目列表与搜索在大量附件下的性能", () => {
  const getDatabase = useVaultDatabase("attachment-list-performance");

  it(`${ENTRY_COUNT} 个条目都带 ${ATTACHMENT_BYTES} 字节的附件时, 列表与搜索不被拖慢`, () => {
    const { orm } = getDatabase();
    seedEntries(orm, true);

    const listMedian = measureMedian(() => listEntrySummaries(orm));
    const searchMedian = measureMedian(() => searchEntries(orm, "zzzzzz"));

    console.info(
      `${ENTRY_COUNT} 个条目都带附件: 列表中位数 ${listMedian.toFixed(2)} ms, 搜索 (无命中) 中位数 ${searchMedian.toFixed(2)} ms (${MEASUREMENT_ROUNDS} 次)`,
    );
    expect(listEntrySummaries(orm)).toHaveLength(ENTRY_COUNT);
    expect(listMedian).toBeLessThan(MAX_ALLOWED_MILLISECONDS);
    expect(searchMedian).toBeLessThan(MAX_ALLOWED_MILLISECONDS);
  });

  it("有附件与没有附件时列表与搜索的结果相同", () => {
    const { orm } = getDatabase();
    seedEntries(orm, true);
    const withAttachments = {
      list: listEntrySummaries(orm),
      search: searchEntries(orm, "entry-4999"),
    };
    orm.run(sql`delete from entry_attachments`);

    expect(listEntrySummaries(orm)).toEqual(withAttachments.list);
    expect(searchEntries(orm, "entry-4999")).toEqual(withAttachments.search);
  });
});
