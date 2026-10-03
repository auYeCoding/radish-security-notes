/**
 * 侧栏里展示的文件夹摘要. 文件夹只有一层, 名称去首尾空格后 1 至 50 个字符且互不重名.
 */
export interface FolderSummary {
  /**
   * 文件夹的唯一编号.
   */
  readonly id: string;
  /**
   * 文件夹名称.
   */
  readonly name: string;
}
