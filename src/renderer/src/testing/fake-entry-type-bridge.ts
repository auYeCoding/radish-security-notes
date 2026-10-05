import { admitNewCustomEntryType } from "@shared/entries/custom-types/custom-entry-type-admission";
import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import { admitCustomEntryTypeUpdate } from "@shared/entries/custom-types/custom-entry-type-edit-admission";
import type {
  RemoveCustomEntryTypeInput,
  UpdateCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-edit-types";
import {
  planCustomEntryTypeFields,
  type CustomEntryTypeFieldPlan,
} from "@shared/entries/custom-types/custom-entry-type-field-plan";
import { measureUpdateImpact } from "@shared/entries/custom-types/custom-entry-type-impact";
import {
  CUSTOM_SUMMARY_FIELD_KEY,
  toCustomFieldKey,
  toCustomTypeKey,
} from "@shared/entries/custom-types/custom-entry-type-key";
import {
  RELOCATION_TARGET_TYPE_KEY,
  relocateEntryValues,
} from "@shared/entries/custom-types/custom-entry-type-relocation";
import {
  customEntryTypeFailed,
  customEntryTypeSucceeded,
  type CustomEntryTypeResult,
} from "@shared/entries/custom-types/custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";
import {
  hasStoredValue,
  isEntryRewriteNeeded,
  remapEntryFieldValues,
} from "@shared/entries/custom-types/custom-entry-type-value-remap";
import { readAccount, type EntryDetail } from "@shared/entries/entry-types";
import { vi } from "vitest";

/**
 * 假桥里新建类型时的编号写法: 前缀加从 1 开始的序号.
 * @param created 已新建的个数, 含这一个.
 * @returns 类型编号.
 */
function typeIdentifierOf(created: number): string {
  return `created-type-${created}`;
}

/**
 * 由校验后的输入生成假桥里的自定义类型, 编号与字段键的写法与主进程一致: 摘要字段的键是
 * `account`, 其余字段的键由类型编号与位置生成.
 * @param created 已新建的个数, 含这一个.
 * @param input 校验后的新建输入.
 * @returns 自定义类型.
 */
function toFakeCustomType(
  created: number,
  input: NewCustomEntryTypeInput,
): CustomEntryType {
  const id = typeIdentifierOf(created);
  return {
    id,
    key: toCustomTypeKey(id),
    name: input.name,
    fields: input.fields.map((field, position) => ({
      key: field.isSummary
        ? CUSTOM_SUMMARY_FIELD_KEY
        : toCustomFieldKey(`${id}-${position}`),
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
    })),
  };
}

/**
 * 假桥里的数据: 自定义类型与它们名下的条目详情, 假桥直接读写这两个数组.
 */
interface FakeTypeData {
  /**
   * 自定义类型, 先创建的在前.
   */
  readonly types: CustomEntryType[];
  /**
   * 条目详情, 修改与删除类型时按主进程的规则原地改写.
   */
  readonly entries: EntryDetail[];
}

/**
 * 按字段计划改写一个类型名下条目的取值与列表摘要账号, 不需要改写时不动.
 * @param data 假桥里的数据, 条目原地改写.
 * @param typeEntries 该类型名下的条目.
 * @param plan 字段计划.
 */
function rewriteTypeEntries(
  data: FakeTypeData,
  typeEntries: readonly EntryDetail[],
  plan: CustomEntryTypeFieldPlan,
): void {
  if (!isEntryRewriteNeeded(plan)) {
    return;
  }
  typeEntries.forEach((entry) => {
    const fields = remapEntryFieldValues(entry.fields, plan);
    data.entries[data.entries.indexOf(entry)] = {
      ...entry,
      fields,
      account: readAccount(fields),
    };
  });
}

/**
 * 在假桥里修改一个自定义类型, 规则与主进程一致: 准入检查, 字段计划, 有取值会丢或保密改非保密而
 * 没有确认时拒绝, 通过后改写类型与它名下条目的取值.
 * @param data 假桥里的数据, 原地改写.
 * @param input 用户提交的修改.
 * @param identifiers 生成新字段键用的编号函数.
 * @returns 修改后的类型, 或失败结果.
 */
function updateFakeType(
  data: FakeTypeData,
  input: UpdateCustomEntryTypeInput,
  identifiers: () => string,
): CustomEntryTypeResult<CustomEntryType> {
  const index = data.types.findIndex((type) => type.id === input.id);
  const current = data.types[index];
  if (current === undefined) {
    return customEntryTypeFailed("not-found");
  }
  const otherNames = data.types
    .filter((type) => type !== current)
    .map((type) => type.name);
  const admitted = admitCustomEntryTypeUpdate(current, input, otherNames);
  if (!admitted.ok) {
    return admitted;
  }
  const plan = planCustomEntryTypeFields({
    current,
    values: admitted.value,
    createIdentifier: identifiers,
  });
  const typeEntries = data.entries.filter(
    (entry) => entry.type === current.key,
  );
  const impact = measureUpdateImpact(current, admitted.value.fields);
  const isImpactReal =
    impact.unsensitizedFields.length > 0 ||
    hasStoredValue(
      typeEntries.map((entry) => entry.fields),
      plan.removedKeys,
    );
  if (isImpactReal && !input.isImpactConfirmed) {
    return customEntryTypeFailed("confirmation-required");
  }
  rewriteTypeEntries(data, typeEntries, plan);
  const updated: CustomEntryType = {
    ...current,
    name: admitted.value.name,
    fields: plan.fields,
  };
  data.types[index] = updated;
  return customEntryTypeSucceeded(updated);
}

/**
 * 在假桥里删除一个自定义类型, 规则与主进程一致: 名下有条目而没有确认时拒绝, 通过后条目改归安全
 * 笔记, 有值的字段转成自定义字段.
 * @param data 假桥里的数据, 原地改写.
 * @param input 用户提交的删除.
 * @param identifiers 生成自定义字段编号用的函数.
 * @returns 删除结果.
 */
function removeFakeType(
  data: FakeTypeData,
  input: RemoveCustomEntryTypeInput,
  identifiers: () => string,
): CustomEntryTypeResult<undefined> {
  const index = data.types.findIndex((type) => type.id === input.id);
  const current = data.types[index];
  if (current === undefined) {
    return customEntryTypeFailed("not-found");
  }
  const typeEntries = data.entries.filter(
    (entry) => entry.type === current.key,
  );
  if (typeEntries.length > 0 && !input.isImpactConfirmed) {
    return customEntryTypeFailed("confirmation-required");
  }
  typeEntries.forEach((entry) => {
    const relocated = relocateEntryValues({
      type: current,
      stored: entry.fields,
      customFields: entry.customFields,
      createIdentifier: identifiers,
    });
    data.entries[data.entries.indexOf(entry)] = {
      ...entry,
      type: RELOCATION_TARGET_TYPE_KEY,
      fields: relocated.fields,
      account: "",
      customFields: relocated.customFields,
    };
  });
  data.types.splice(index, 1);
  return customEntryTypeSucceeded(undefined);
}

/**
 * 创建组件测试用的假自定义类型桥: 类型存在内存里, 先创建的在前, 每个方法都是间谍.
 * @param initial 初始自定义类型, 按创建先后排列.
 * @param overrides 覆盖假桥上的方法, 例如让新建失败.
 * @param sharedTypes 与假条目桥共享的自定义类型数组, 假桥直接读写它, 传入时 `initial` 被忽略,
 * 默认是 `initial` 的副本.
 * @param sharedEntries 与假条目桥共享的条目详情数组, 修改与删除类型时假桥按主进程的规则改写它,
 * 默认没有条目.
 * @returns 假自定义类型桥.
 */
export function createFakeEntryTypeBridge(
  initial: readonly CustomEntryType[] = [],
  overrides: Partial<CustomEntryTypeBridge> = {},
  sharedTypes: CustomEntryType[] | undefined = undefined,
  sharedEntries: EntryDetail[] | undefined = undefined,
): CustomEntryTypeBridge {
  const types = sharedTypes ?? [...initial];
  const data: FakeTypeData = { types, entries: sharedEntries ?? [] };
  let created = 0;
  let generated = 0;
  const identifiers = (): string => `fake-id-${(generated += 1)}`;
  return {
    list: vi.fn(() => Promise.resolve(customEntryTypeSucceeded([...types]))),
    create: vi.fn((input: NewCustomEntryTypeInput) => {
      const admitted = admitNewCustomEntryType(
        input,
        types.map((existing) => existing.name),
      );
      if (!admitted.ok) {
        return Promise.resolve(admitted);
      }
      created += 1;
      const type = toFakeCustomType(created, admitted.value);
      types.push(type);
      return Promise.resolve(customEntryTypeSucceeded(type));
    }),
    update: vi.fn((input: UpdateCustomEntryTypeInput) =>
      Promise.resolve(updateFakeType(data, input, identifiers)),
    ),
    remove: vi.fn((input: RemoveCustomEntryTypeInput) =>
      Promise.resolve(removeFakeType(data, input, identifiers)),
    ),
    ...overrides,
  };
}
