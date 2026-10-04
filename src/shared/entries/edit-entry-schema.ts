import { z } from "zod";

import {
  createEntryContentShape,
  type NewEntryFormValues,
} from "./new-entry-schema";
import type { EntryTypeDefinition } from "./entry-field-types";

/**
 * 编辑条目表单的取值, 不含类型, 条目的类型保持不变. `totp` 为空串表示保持原来的 TOTP 配置,
 * 不为空表示用新的密钥或链接替换; `removeTotp` 为真表示移除 TOTP, 优先于 `totp`.
 */
export interface EditEntryFormValues extends NewEntryFormValues {
  /**
   * 是否移除条目原有的 TOTP.
   */
  removeTotp: boolean;
}

/**
 * 按类型生成编辑条目的校验方案, 渲染端表单与主进程共用: 内容规则与新建一致, 见
 * `createEntryContentShape`, 另有移除 TOTP 的布尔值.
 * @param type 条目类型定义.
 * @returns 该类型的编辑条目校验方案.
 */
export function createEditEntrySchema(
  type: EntryTypeDefinition,
): z.ZodType<EditEntryFormValues, EditEntryFormValues> {
  return z.object({
    ...createEntryContentShape(type),
    removeTotp: z.boolean(),
  });
}
