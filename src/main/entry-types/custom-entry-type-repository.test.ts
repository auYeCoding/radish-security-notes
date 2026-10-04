import { describe, expect, it } from "vitest";

import { useVaultDatabase } from "../testing/use-vault-database";
import { buildCustomEntryTypeRows } from "./custom-entry-type-record-builder";
import {
  insertCustomEntryType,
  listCustomEntryTypeRows,
} from "./custom-entry-type-repository";

/**
 * 生成一个测试用的类型行与字段行, 编号带前缀以便区分.
 * @param prefix 编号前缀.
 * @param createdAt 创建时间.
 * @returns 类型行与字段行.
 */
function rowsOf(
  prefix: string,
  createdAt: number,
): ReturnType<typeof buildCustomEntryTypeRows> {
  let counter = 0;
  return buildCustomEntryTypeRows({
    values: {
      name: `${prefix}类型`,
      fields: [
        { name: "甲", kind: "singleLine", isSensitive: false, isSummary: true },
        { name: "乙", kind: "multiLine", isSensitive: true, isSummary: false },
      ],
    },
    createIdentifier: () => `${prefix}-${(counter += 1)}`,
    createdAt,
  });
}

describe("自定义类型仓库", () => {
  const getDatabase = useVaultDatabase("custom-type-repository");

  it("没有自定义类型时读出空列表", () => {
    expect(listCustomEntryTypeRows(getDatabase().orm)).toEqual([]);
  });

  it("写入后按创建先后读出, 每个类型带自己的字段, 字段按位置排列", () => {
    const { orm } = getDatabase();
    const later = rowsOf("b", 20);
    const earlier = rowsOf("a", 10);
    insertCustomEntryType(orm, later);
    insertCustomEntryType(orm, earlier);

    expect(listCustomEntryTypeRows(orm)).toEqual([earlier, later]);
  });

  it("字段行写入失败时类型行一并回滚, 两张表都不留下行", () => {
    const { orm } = getDatabase();
    const rows = rowsOf("a", 10);
    const [first] = rows.fields;
    const broken = {
      type: rows.type,
      fields: [first, first],
    } as unknown as ReturnType<typeof rowsOf>;

    expect(() => insertCustomEntryType(orm, broken)).toThrow();
    expect(listCustomEntryTypeRows(orm)).toEqual([]);
  });
});
