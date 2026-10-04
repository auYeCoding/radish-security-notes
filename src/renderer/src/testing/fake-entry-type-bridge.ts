import { admitNewCustomEntryType } from "@shared/entries/custom-types/custom-entry-type-admission";
import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import {
  CUSTOM_SUMMARY_FIELD_KEY,
  toCustomFieldKey,
  toCustomTypeKey,
} from "@shared/entries/custom-types/custom-entry-type-key";
import { customEntryTypeSucceeded } from "@shared/entries/custom-types/custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";
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
 * 创建组件测试用的假自定义类型桥: 类型存在内存里, 先创建的在前, 每个方法都是间谍.
 * @param initial 初始自定义类型, 按创建先后排列.
 * @param overrides 覆盖假桥上的方法, 例如让新建失败.
 * @param sharedTypes 与假条目桥共享的自定义类型数组, 假桥直接读写它, 传入时 `initial` 被忽略,
 * 默认是 `initial` 的副本.
 * @returns 假自定义类型桥.
 */
export function createFakeEntryTypeBridge(
  initial: readonly CustomEntryType[] = [],
  overrides: Partial<CustomEntryTypeBridge> = {},
  sharedTypes: CustomEntryType[] | undefined = undefined,
): CustomEntryTypeBridge {
  const types = sharedTypes ?? [...initial];
  let created = 0;
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
    ...overrides,
  };
}
