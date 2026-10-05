import type {
  RemoveCustomEntryTypeInput,
  UpdateCustomEntryTypeInput,
} from "./custom-entry-type-edit-types";
import type { CustomEntryTypeResult } from "./custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "./custom-entry-type-types";

/**
 * preload 暴露给渲染进程的自定义条目类型接口, 渲染进程只经它读取, 新建, 修改与删除自定义类型.
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
  /**
   * 修改一个自定义类型: 改名, 改字段, 增删字段, 改摘要字段. 已有条目在同一个事务里随之改写.
   * @param input 要修改的类型编号, 修改后的名称与字段, 以及用户是否已确认影响.
   * @returns 修改后的自定义类型, 会丢失取值或把保密字段改成非保密而用户还没确认时为失败结果.
   */
  update: (
    input: UpdateCustomEntryTypeInput,
  ) => Promise<CustomEntryTypeResult<CustomEntryType>>;
  /**
   * 删除一个自定义类型. 类型下已有的条目在同一个事务里改归安全笔记, 字段取值转成条目的自定义
   * 字段.
   * @param input 要删除的类型编号, 以及用户是否已确认影响.
   * @returns 删除结果, 类型下有条目而用户还没确认时为失败结果.
   */
  remove: (
    input: RemoveCustomEntryTypeInput,
  ) => Promise<CustomEntryTypeResult<undefined>>;
}
