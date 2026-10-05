import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";

import type { SourceLoss } from "../source-adapter";
import type { JsonRecord } from "./json-values";

/**
 * 按条目类型映射出的内容: 类型键与类型字段, 以及这种类型自己带来的备注, 自定义字段, TOTP 与损失.
 * 所有类型共有的部分 (名称, 文件夹, 自定义字段数组, 收藏等) 由条目映射器统一处理.
 */
export interface TypedFragment {
  /**
   * 本应用的预设类型键.
   */
  readonly typeKey: string;
  /**
   * 类型字段取值.
   */
  readonly fields: Readonly<Record<string, string>>;
  /**
   * 备注, 没有时为空串.
   */
  readonly notes?: string;
  /**
   * 这种类型自己带来的自定义字段, 例如多出的网址.
   */
  readonly customFields?: readonly NewCustomFieldInput[];
  /**
   * TOTP 输入, 没有时为空串.
   */
  readonly totp?: string;
  /**
   * 这种类型自己带来的损失, 例如通行密钥.
   */
  readonly losses?: readonly SourceLoss[];
}

/**
 * 把某种类型的 Bitwarden 条目映射成类型相关的内容.
 */
export type TypeMapper = (item: JsonRecord) => TypedFragment;
