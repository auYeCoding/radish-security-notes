import { describe, expect, it } from "vitest";

import { sortByName, type Named } from "./sort-by-name";

/**
 * 性能测试用的名称个数.
 */
const NAME_COUNT = 5000;

/**
 * 重复测量的次数, 取中位数, 减少偶发抖动的影响.
 */
const MEASUREMENT_ROUNDS = 7;

/**
 * 允许的耗时上限, 单位毫秒. 远高于实测值, 只防止排序退化成明显拖慢列表的量级.
 */
const MAX_ALLOWED_MILLISECONDS = 1000;

/**
 * 生成名称用的汉字池.
 */
const HAN_POOL = Array.from(
  "邮箱账号淘宝微信银行密码工作家庭购物学习旅行游戏音乐阅读健康财务重庆长沙",
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
 * 按序号从池里取一项, 序号超出池长时回绕.
 * @param pool 候选池.
 * @param index 序号.
 * @returns 池里的一项.
 */
function pick<T>(pool: readonly T[], index: number): T {
  return pool[index % pool.length];
}

/**
 * 按序号确定地生成一个名称, 覆盖纯英文, 中英混杂, 纯中文, 数字开头与符号开头五种形状.
 * @param index 名称序号.
 * @returns 名称.
 */
function nameAt(index: number): string {
  const han = pick(HAN_POOL, index) + pick(HAN_POOL, index * 7 + 3);
  const english = pick(ENGLISH_POOL, index);
  switch (index % 5) {
    case 0:
      return `${english}${index}`;
    case 1:
      return `${han}${english}`;
    case 2:
      return `${han}${pick(HAN_POOL, index * 3 + 1)}`;
    case 3:
      return `${index}${han}`;
    default:
      return `_${english}${index}`;
  }
}

/**
 * 测量一次对给定对象排序的耗时.
 * @param items 要排序的对象.
 * @returns 耗时, 单位毫秒.
 */
function measureOnce(items: readonly Named[]): number {
  const start = performance.now();
  sortByName(items);
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

describe("sortByName 的性能", () => {
  it(`对 ${NAME_COUNT} 个中英混杂名称排序不拖慢列表`, () => {
    const items = Array.from({ length: NAME_COUNT }, (_value, index) => ({
      name: nameAt(index),
    }));
    measureOnce(items);

    const durations = Array.from({ length: MEASUREMENT_ROUNDS }, () =>
      measureOnce(items),
    );

    console.info(
      `sortByName ${NAME_COUNT} 个名称: 中位数 ${median(durations).toFixed(2)} ms, 最小 ${Math.min(...durations).toFixed(2)} ms, 最大 ${Math.max(...durations).toFixed(2)} ms (${MEASUREMENT_ROUNDS} 次)`,
    );
    expect(median(durations)).toBeLessThan(MAX_ALLOWED_MILLISECONDS);
  });
});
