import { describe, expect, it } from "vitest";

import type {
  NativeCustomTypeDocument,
  NativeEntryDocument,
} from "../export/serializers/native/native-format-types";
import {
  toAttachmentRow,
  toCustomTypeRows,
  toEntryRecord,
  toFolderRecord,
  toTagRecord,
} from "./restore-record-mapper";

/**
 * 带全部内容的条目文档.
 */
const FULL_ENTRY: NativeEntryDocument = {
  id: "e1",
  type: "login",
  name: "示例",
  fields: { account: "a" },
  notes: "备注",
  notesFormat: "markdown",
  customFields: [{ id: "c1", label: "L", value: "V", isHidden: true }],
  totp: { secret: "GEZDGNBV", algorithm: "SHA1", digits: 6, periodSeconds: 30 },
  folderId: "f1",
  tagIds: ["t1"],
  createdAt: 1234,
  attachments: [],
};

/**
 * 没有文件夹, 标签与 TOTP 的条目文档.
 */
const BARE_ENTRY: NativeEntryDocument = {
  ...FULL_ENTRY,
  id: "e2",
  totp: null,
  folderId: null,
  tagIds: [],
};

/**
 * 带两个字段的自定义类型文档.
 */
const ROUTER_TYPE: NativeCustomTypeDocument = {
  id: "type-1",
  key: "custom:type-1",
  name: "路由器",
  fields: [
    { key: "account", name: "地址", kind: "singleLine", isSensitive: false },
    { key: "field-a", name: "口令", kind: "multiLine", isSensitive: true },
  ],
};

describe("备份文档转库行: 文件夹, 标签与自定义类型", () => {
  it("文件夹与标签原样保留编号与名称, 创建时间由调用方给出", () => {
    expect(toFolderRecord({ id: "f1", name: "工作" }, 99)).toEqual({
      id: "f1",
      name: "工作",
      createdAt: 99,
    });
    expect(toTagRecord({ id: "t1", name: "重要", color: "red" }, 99)).toEqual({
      id: "t1",
      name: "重要",
      color: "red",
      createdAt: 99,
    });
  });

  it("自定义类型转成类型行与字段行, 字段位置按备份里的顺序", () => {
    const rows = toCustomTypeRows(ROUTER_TYPE, 7);

    expect(rows.type).toEqual({ id: "type-1", name: "路由器", createdAt: 7 });
    expect(rows.fields.map((field) => [field.key, field.position])).toEqual([
      ["account", 0],
      ["field-a", 1],
    ]);
    expect(rows.fields[1]).toEqual({
      typeId: "type-1",
      key: "field-a",
      position: 1,
      name: "口令",
      kind: "multiLine",
      isSensitive: true,
    });
  });
});

describe("备份文档转库行: 条目与附件", () => {
  it("条目的全部内容原样保留, 附件不进条目行", () => {
    expect(toEntryRecord(FULL_ENTRY)).toEqual({
      id: "e1",
      name: "示例",
      type: "login",
      fields: { account: "a" },
      notes: "备注",
      notesFormat: "markdown",
      customFields: [{ id: "c1", label: "L", value: "V", isHidden: true }],
      totp: FULL_ENTRY.totp,
      folderId: "f1",
      createdAt: 1234,
    });
  });

  it("没有文件夹与 TOTP 的条目写成空值", () => {
    const entry = toEntryRecord(BARE_ENTRY);

    expect(entry.totp).toBeNull();
    expect(entry.folderId).toBeNull();
  });

  it("附件元数据行带所属条目的编号", () => {
    const attachment = {
      id: "a1",
      name: "文件.pdf",
      size: 5,
      position: 2,
      path: "attachments/a1",
    };

    expect(toAttachmentRow(attachment, "e1")).toEqual({
      id: "a1",
      entryId: "e1",
      name: "文件.pdf",
      size: 5,
      position: 2,
    });
  });
});
