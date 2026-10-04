import type { CustomEntryTypeResult } from "./custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "./custom-entry-type-types";

/**
 * preload 暴露给渲染进程的自定义条目类型接口, 渲染进程只经它读取与新建自定义类型.
 */
export interface CustomEntryTypeBridge {
  /**
   * 读取全部自定义类型, 先创建的在前.
   * @returns 自定义类型列表.
   */
  list: () => Promise<CustomEntryTypeResult<readonly CustomEntryType[]>>;
  /**
   * 新建一个自定义类型.
   * @param input 用户填写的类型名称与字段.
   * @returns 新建的自定义类型.
   */
  create: (
    input: NewCustomEntryTypeInput,
  ) => Promise<CustomEntryTypeResult<CustomEntryType>>;
}
