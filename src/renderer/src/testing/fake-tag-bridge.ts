import type { TagBridge } from "@shared/tags/tag-bridge";
import type { TagColorKey } from "@shared/tags/tag-colors";
import { isSameTagName } from "@shared/tags/tag-name-match";
import {
  createTagFormSchema,
  type TagFormValues,
} from "@shared/tags/tag-name-schema";
import {
  tagFailed,
  tagSucceeded,
  type TagResult,
} from "@shared/tags/tag-result";
import type { TagSummary } from "@shared/tags/tag-types";
import { vi } from "vitest";

/**
 * 校验名称与颜色并检查重名, 与主进程的标签服务规则一致.
 * @param tags 现有的标签.
 * @param name 用户填写的名称.
 * @param color 用户选的颜色键.
 * @param ownIdentifier 编辑时自己的编号, 新建时为 undefined.
 * @returns 去空格后的名称与颜色, 或失败结果.
 */
function checkValues(
  tags: readonly TagSummary[],
  name: string,
  color: TagColorKey,
  ownIdentifier: string | undefined,
): TagFormValues | TagResult<never> {
  const parsed = createTagFormSchema().safeParse({ name, color });
  if (!parsed.success) {
    return tagFailed("invalid-input");
  }
  const taken = tags.some(
    (tag) =>
      tag.id !== ownIdentifier && isSameTagName(tag.name, parsed.data.name),
  );
  return taken ? tagFailed("name-taken") : parsed.data;
}

/**
 * 创建组件测试用的假标签桥: 标签存在内存里, 先创建的在前, 每个方法都是间谍. 条目上的标签
 * 由条目 store 在内存里更新, 假桥不记录.
 * @param initial 初始标签, 按创建先后排列.
 * @param overrides 覆盖假桥上的方法, 例如让删除失败.
 * @returns 假标签桥.
 */
export function createFakeTagBridge(
  initial: readonly TagSummary[] = [],
  overrides: Partial<TagBridge> = {},
): TagBridge {
  const tags = [...initial];
  let created = 0;
  return {
    list: vi.fn(() => Promise.resolve(tagSucceeded([...tags]))),
    create: vi.fn((name: string, color: TagColorKey) => {
      const checked = checkValues(tags, name, color, undefined);
      if ("ok" in checked) {
        return Promise.resolve(checked);
      }
      created += 1;
      const tag = { id: `created-tag-${created}`, ...checked };
      tags.push(tag);
      return Promise.resolve(tagSucceeded(tag));
    }),
    update: vi.fn((id: string, name: string, color: TagColorKey) => {
      const index = tags.findIndex((tag) => tag.id === id);
      if (index < 0) {
        return Promise.resolve(tagFailed("not-found"));
      }
      const checked = checkValues(tags, name, color, id);
      if ("ok" in checked) {
        return Promise.resolve(checked);
      }
      const updated = { id, ...checked };
      tags[index] = updated;
      return Promise.resolve(tagSucceeded(updated));
    }),
    remove: vi.fn((id: string) => {
      const index = tags.findIndex((tag) => tag.id === id);
      if (index < 0) {
        return Promise.resolve(tagFailed("not-found"));
      }
      tags.splice(index, 1);
      return Promise.resolve(tagSucceeded(undefined));
    }),
    ...overrides,
  };
}
