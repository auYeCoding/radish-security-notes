import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import type { EntryBridge } from "@shared/entries/entry-bridge";
import {
  entryFailed,
  entrySucceeded,
  type EntryResult,
} from "@shared/entries/entry-result";
import {
  readAccount,
  toEntrySummary,
  type EntryDetail,
  type NewEntryInput,
  type UpdateEntryInput,
} from "@shared/entries/entry-types";
import type { TagSummary } from "@shared/tags/tag-types";
import { vi } from "vitest";

import { searchFakeEntries } from "./fake-entry-search";

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
    notesFormat: input.notesFormat,
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
    notesFormat: input.notesFormat,
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
 * 更新假桥里存着的一个条目, 找不到时不改动.
 * @param details 假桥里的条目详情, 原地更新.
 * @param id 条目编号.
 * @param input 更新输入.
 * @returns 更新后的条目详情, 没有这个编号时为失败结果.
 */
function updateStoredDetail(
  details: EntryDetail[],
  id: string,
  input: UpdateEntryInput,
): EntryResult<EntryDetail> {
  const index = details.findIndex((detail) => detail.id === id);
  const existing = details[index];
  if (existing === undefined) {
    return entryFailed("not-found");
  }
  const detail = detailFromUpdate(existing, input);
  details[index] = detail;
  return entrySucceeded(detail);
}

/**
 * 从假桥里移除一个条目.
 * @param details 假桥里的条目详情, 原地移除.
 * @param id 条目编号.
 * @returns 移除结果, 没有这个编号时为失败结果.
 */
function removeStoredDetail(
  details: EntryDetail[],
  id: string,
): EntryResult<undefined> {
  const index = details.findIndex((detail) => detail.id === id);
  if (index < 0) {
    return entryFailed("not-found");
  }
  details.splice(index, 1);
  return entrySucceeded(undefined);
}

/**
 * 创建组件测试用的假条目桥: 条目存在内存里, 最新创建的在最前, 每个方法都是间谍.
 * @param initial 初始条目, 按最新创建在前排列.
 * @param overrides 覆盖假桥上的方法, 例如让复制失败.
 * @param tags 假标签桥里的标签, 搜索时用来把条目的标签编号换成标签名.
 * @param sharedDetails 与假批量桥共享的条目数据数组, 假桥直接读写它, 传入时 `initial` 被忽略, 默认
 * 是 `initial` 的副本.
 * @param customTypes 假自定义类型桥里的自定义类型, 搜索时用来取自定义类型的可搜字段, 默认没有.
 * @returns 假条目桥.
 */
export function createFakeEntryBridge(
  initial: readonly EntryDetail[] = [],
  overrides: Partial<EntryBridge> = {},
  tags: readonly TagSummary[] = [],
  sharedDetails: EntryDetail[] | undefined = undefined,
  customTypes: readonly CustomEntryType[] = [],
): EntryBridge {
  const details = sharedDetails ?? [...initial];
  return {
    list: vi.fn(() =>
      Promise.resolve(entrySucceeded(details.map(toEntrySummary))),
    ),
    search: vi.fn((query: string) =>
      Promise.resolve(
        entrySucceeded(searchFakeEntries(details, tags, query, customTypes)),
      ),
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
    update: vi.fn((id: string, input) =>
      Promise.resolve(updateStoredDetail(details, id, input)),
    ),
    remove: vi.fn((id: string) =>
      Promise.resolve(removeStoredDetail(details, id)),
    ),
    copyField: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    copyCustomField: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    ...overrides,
  };
}
