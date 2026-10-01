import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 安全笔记类型: 只有一个多行的内容字段, 不遮罩.
 */
export const SECURE_NOTE_TYPE = defineEntryType("secureNote", [
  defineField("content", { isMultiline: true }),
]);
