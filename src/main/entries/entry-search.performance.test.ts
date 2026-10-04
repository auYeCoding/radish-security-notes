import { describe, expect, it } from "vitest";

import {
  searchRecordOf,
  insertTagNamed,
} from "../testing/search-record-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { replaceEntryTags } from "../tags/entry-tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { insertEntry } from "./entry-repository";
import { searchEntries } from "./entry-search";

/**
 * 性能测试用的条目个数.
 */
const ENTRY_COUNT = 5000;

/**
 * 重复测量的次数, 取中位数, 减少偶发抖动的影响.
 */
const MEASUREMENT_ROUNDS = 7;

/**
 * 允许的耗时上限, 单位毫秒. 远高于实测值, 只防止搜索退化成明显拖慢输入的量级.
 */
const MAX_ALLOWED_MILLISECONDS = 1000;

/**
 * 生成名称用的汉字池.
 */
const HAN_POOL = Array.from(
  "邮箱账号淘宝微信银行密码工作家庭购物学习旅行游戏音乐阅读",
);

/**
 * 生成名称用的英文词池.
 */
const ENGLISH_POOL = [
  "Gmail",
  "GitHub",
  "Steam",
  "Netflix",
  "Amazon",
  "Zoom",
  "Slack",
  "Notion",
  "Figma",
  "Docker",
];

/**
 * 测试库里的标签数.
 */
const TAG_COUNT = 20;

/**
 * 按序号从池里取一项, 序号超出池长时回绕.
 * @param pool 候选池.
 * @param index 序号.
 * @returns 池里的一项.
 */
function pick<T>(pool: readonly T[], index: number): T {
  return pool[index % pool.length];
}

/**
 * 写入测试库: 5000 个条目, 名称中英混杂, 每个条目有账号, 网址, 多行备注, 两个自定义字段与 TOTP,
 * 三分之一的条目带一个标签.
 * @param orm 已解锁数据库的查询入口.
 */
function seedEntries(orm: VaultOrm): void {
  orm.transaction((transaction) => {
    for (let tag = 0; tag < TAG_COUNT; tag += 1) {
      insertTagNamed(
        transaction,
        `tag-${tag}`,
        `标签${tag}-${pick(ENGLISH_POOL, tag)}`,
      );
    }
    for (let index = 0; index < ENTRY_COUNT; index += 1) {
      const id = `entry-${index}`;
      insertEntry(
        transaction,
        searchRecordOf(id, {
          name: `${pick(HAN_POOL, index)}${pick(HAN_POOL, index * 7 + 3)}${pick(ENGLISH_POOL, index)}${index}`,
          notes: `第一行备注 ${pick(ENGLISH_POOL, index * 3)}\n第二行备注 ${index}`,
        }),
      );
      if (index % 3 === 0) {
        replaceEntryTags(transaction, id, [`tag-${index % TAG_COUNT}`]);
      }
    }
  });
}

/**
 * 测量一次搜索的耗时.
 * @param orm 已解锁数据库的查询入口.
 * @param query 关键字.
 * @returns 耗时, 单位毫秒.
 */
function measureOnce(orm: VaultOrm, query: string): number {
  const start = performance.now();
  searchEntries(orm, query);
  return performance.now() - start;
}

/**
 * 取一组耗时的中位数.
 * @param durations 耗时列表.
 * @returns 中位数.
 */
function median(durations: readonly number[]): number {
  const sorted = [...durations].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)];
}

describe("searchEntries 的性能", () => {
  const getDatabase = useVaultDatabase("entry-search-performance");

  it.each([
    ["命中很多条目的英文词", "gmail"],
    ["多个词", "github 备注 工作"],
    ["拼音首字母", "yx"],
    ["命中名称里的数字", "4999"],
    ["没有任何命中, 每个条目的每个字段都要比对", "zzzzzz"],
  ])(`在 ${ENTRY_COUNT} 个条目里搜索: %s 不拖慢输入`, (_label, query) => {
    const { orm } = getDatabase();
    seedEntries(orm);
    measureOnce(orm, query);

    const durations = Array.from({ length: MEASUREMENT_ROUNDS }, () =>
      measureOnce(orm, query),
    );

    console.info(
      `searchEntries ${ENTRY_COUNT} 个条目 关键字 "${query}": 中位数 ${median(durations).toFixed(2)} ms, 最小 ${Math.min(...durations).toFixed(2)} ms, 最大 ${Math.max(...durations).toFixed(2)} ms (${MEASUREMENT_ROUNDS} 次)`,
    );
    expect(median(durations)).toBeLessThan(MAX_ALLOWED_MILLISECONDS);
  });
});
