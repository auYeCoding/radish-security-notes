import type { EntryBridge } from "@shared/entries/entry-bridge";
import { entryFailed, entrySucceeded } from "@shared/entries/entry-result";
import {
  readAccount,
  toEntrySummary,
  type EntryDetail,
  type NewEntryInput,
  type UpdateEntryInput,
} from "@shared/entries/entry-types";
import { vi } from "vitest";

/**
 * 假桥给自定义字段编号时的写法: 前缀加从 1 开始的位置.
 * @param prefix 编号前缀.
 * @param fields 用户填写的自定义字段.
 * @returns 带编号的自定义字段.
 */
function withFieldIdentifiers(
  prefix: string,
  fields: NewEntryInput["customFields"],
): EntryDetail["customFields"] {
  return fields.map((field, index) => ({
    id: `${prefix}-${index + 1}`,
    label: field.label.trim(),
    value: field.value,
    isHidden: field.isHidden,
  }));
}

/**
 * 由新建输入生成假桥里的条目详情.
 * @param id 条目编号.
 * @param input 新建输入.
 * @returns 条目详情.
 */
function detailFromCreate(id: string, input: NewEntryInput): EntryDetail {
  return {
    id,
    name: input.name.trim(),
    type: input.type,
    account: readAccount(input.fields),
    fields: input.fields,
    notes: input.notes,
    customFields: withFieldIdentifiers("created-field", input.customFields),
    hasTotp: input.totp.trim() !== "",
    folderId: input.folderId,
    tagIds: input.tagIds,
  };
}

/**
 * 由更新输入生成更新后的条目详情: 类型与编号不变, TOTP 按保持, 替换, 移除处理.
 * @param existing 更新前的条目详情.
 * @param input 更新输入.
 * @returns 更新后的条目详情.
 */
function detailFromUpdate(
  existing: EntryDetail,
  input: UpdateEntryInput,
): EntryDetail {
  const hasTotp = input.removeTotp
    ? false
    : existing.hasTotp || input.totp.trim() !== "";
  return {
    ...existing,
    name: input.name.trim(),
    account: readAccount(input.fields),
    fields: input.fields,
    notes: input.notes,
    customFields: withFieldIdentifiers(
      `${existing.id}-updated-field`,
      input.customFields,
    ),
    hasTotp,
    folderId: input.folderId,
    tagIds: input.tagIds,
  };
}

/**
 * 创建组件测试用的假条目桥: 条目存在内存里, 最新创建的在最前, 每个方法都是间谍.
 * @param initial 初始条目, 按最新创建在前排列.
 * @param overrides 覆盖假桥上的方法, 例如让复制失败.
 * @returns 假条目桥.
 */
export function createFakeEntryBridge(
  initial: readonly EntryDetail[] = [],
  overrides: Partial<EntryBridge> = {},
): EntryBridge {
  const details = [...initial];
  return {
    list: vi.fn(() =>
      Promise.resolve(entrySucceeded(details.map(toEntrySummary))),
    ),
    get: vi.fn((id: string) => {
      const found = details.find((detail) => detail.id === id);
      return Promise.resolve(
        found === undefined ? entryFailed("not-found") : entrySucceeded(found),
      );
    }),
    create: vi.fn((input) => {
      const detail = detailFromCreate(`created-${details.length + 1}`, input);
      details.unshift(detail);
      return Promise.resolve(entrySucceeded(detail));
    }),
    update: vi.fn((id: string, input) => {
      const index = details.findIndex((detail) => detail.id === id);
      const existing = details[index];
      if (existing === undefined) {
        return Promise.resolve(entryFailed("not-found"));
      }
      const detail = detailFromUpdate(existing, input);
      details[index] = detail;
      return Promise.resolve(entrySucceeded(detail));
    }),
    remove: vi.fn((id: string) => {
      const index = details.findIndex((detail) => detail.id === id);
      if (index < 0) {
        return Promise.resolve(entryFailed("not-found"));
      }
      details.splice(index, 1);
      return Promise.resolve(entrySucceeded(undefined));
    }),
    copyField: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    copyCustomField: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    ...overrides,
  };
}
