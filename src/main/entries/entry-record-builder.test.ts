import { describe, expect, it } from "vitest";

import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import { buildEntryRecord } from "./entry-record-builder";

describe("buildEntryRecord", () => {
  it("先取条目编号, 再依次给自定义字段取编号, 记下类型与创建时间", () => {
    let counter = 0;

    const record = buildEntryRecord({
      type: LOGIN_TYPE,
      values: {
        name: "论坛",
        fields: { account: "a", password: "p", url: "" },
        notes: "备注",
        customFields: [
          { label: "一", value: "1", isHidden: false },
          { label: "二", value: "2", isHidden: true },
        ],
      },
      createIdentifier: () => `id-${(counter += 1)}`,
      createdAt: 42,
    });

    expect(record).toEqual({
      id: "id-1",
      name: "论坛",
      type: "login",
      fields: { account: "a", password: "p", url: "" },
      notes: "备注",
      customFields: [
        { id: "id-2", label: "一", value: "1", isHidden: false },
        { id: "id-3", label: "二", value: "2", isHidden: true },
      ],
      createdAt: 42,
    });
  });
});
