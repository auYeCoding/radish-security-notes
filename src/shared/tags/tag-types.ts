import type { TagColorKey } from "./tag-colors";

/**
 * 侧栏与表单里展示的标签摘要. 标签名称去首尾空格后 1 至 50 个字符且互不重名.
 */
export interface TagSummary {
  /**
   * 标签的唯一编号.
   */
  readonly id: string;
  /**
   * 标签名称.
   */
  readonly name: string;
  /**
   * 标签在调色板里的颜色键.
   */
  readonly color: TagColorKey;
}
