import type { TagSummary } from "@shared/tags/tag-types";

/**
 * 测试用的重要标签, 红色.
 */
export const IMPORTANT_TAG: TagSummary = {
  id: "important",
  name: "重要",
  color: "red",
};

/**
 * 测试用的工作标签, 蓝色.
 */
export const WORK_TAG: TagSummary = {
  id: "work-tag",
  name: "工作",
  color: "blue",
};

/**
 * 测试用的个人标签, 默认的灰色.
 */
export const PERSONAL_TAG: TagSummary = {
  id: "personal-tag",
  name: "个人",
  color: "slate",
};

/**
 * 测试用的三个标签, 按创建先后排列.
 */
export const TEST_TAGS: readonly TagSummary[] = [
  IMPORTANT_TAG,
  WORK_TAG,
  PERSONAL_TAG,
];
