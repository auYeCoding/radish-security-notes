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

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  deleteTag,
  findTag,
  insertTag,
  listTags,
  updateTag,
  type TagRecord,
} from "./tag-repository";

/**
 * 标签服务的依赖.
 */
export interface TagServiceDependencies extends DatabaseAccess {
  /**
   * 生成新标签的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
}

/**
 * 把表里的一行转成标签摘要.
 * @param record 标签所在的行.
 * @returns 标签摘要.
 */
function toSummary(record: TagRecord): TagSummary {
  return { id: record.id, name: record.name, color: record.color };
}

/**
 * 校验用户填写的标签名称与颜色, 名称去掉首尾空格.
 * @param name 用户填写的名称.
 * @param color 用户选的颜色键, 不在调色板里时校验不通过.
 * @returns 校验通过的取值, 不合规时为 undefined.
 */
function parseTagValues(
  name: string,
  color: string,
): TagFormValues | undefined {
  const parsed = createTagFormSchema().safeParse({ name, color });
  return parsed.success ? parsed.data : undefined;
}

/**
 * 判断名称是否与别的标签重名.
 * @param orm 已解锁数据库的查询入口.
 * @param name 已校验的名称.
 * @param ownIdentifier 编辑时自己的编号, 新建时为 undefined.
 * @returns 与别的标签重名时返回 true.
 */
function isNameTaken(
  orm: VaultOrm,
  name: string,
  ownIdentifier: string | undefined,
): boolean {
  return listTags(orm).some(
    (record) => record.id !== ownIdentifier && isSameTagName(record.name, name),
  );
}

/**
 * 标签服务: 在已解锁的加密数据库里新建, 编辑, 删除与列出标签. 给条目打标签由条目服务完成.
 * 标签名称只在方法执行期间经过内存, 不写入日志.
 */
export class TagService {
  /**
   * 创建标签服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: TagServiceDependencies) {}

  /**
   * 读取全部标签, 先创建的在前.
   * @returns 标签摘要列表, 未解锁时为失败结果.
   */
  list(): TagResult<readonly TagSummary[]> {
    return this.withDatabase((orm) =>
      tagSucceeded(listTags(orm).map(toSummary)),
    );
  }

  /**
   * 新建一个标签: 名称去首尾空格, 校验长度与颜色并拒绝与已有标签重名, 生成编号与创建时间后写入.
   * @param name 用户填写的名称.
   * @param color 用户选的颜色键, 不在调色板里时为输入不合规.
   * @returns 新建的标签摘要, 未解锁, 输入不合规或重名时为失败结果.
   */
  create(name: string, color: string): TagResult<TagSummary> {
    return this.withDatabase((orm) => {
      const values = parseTagValues(name, color);
      if (values === undefined) {
        return tagFailed("invalid-input");
      }
      if (isNameTaken(orm, values.name, undefined)) {
        return tagFailed("name-taken");
      }
      const record: TagRecord = {
        id: this.dependencies.createIdentifier(),
        name: values.name,
        color: values.color,
        createdAt: this.dependencies.now(),
      };
      insertTag(orm, record);
      return tagSucceeded(toSummary(record));
    });
  }

  /**
   * 编辑一个标签的名称与颜色: 规则与新建一致, 与自己同名 (只改了大小写或空格) 不算重名.
   * @param id 标签编号.
   * @param name 用户填写的新名称.
   * @param color 用户选的新颜色键, 不在调色板里时为输入不合规.
   * @returns 编辑后的标签摘要, 未解锁, 没有这个编号, 输入不合规或重名时为失败结果.
   */
  update(id: string, name: string, color: string): TagResult<TagSummary> {
    return this.withDatabase((orm) => {
      if (findTag(orm, id) === undefined) {
        return tagFailed("not-found");
      }
      const values = parseTagValues(name, color);
      if (values === undefined) {
        return tagFailed("invalid-input");
      }
      if (isNameTaken(orm, values.name, id)) {
        return tagFailed("name-taken");
      }
      updateTag(orm, id, values.name, values.color);
      return tagSucceeded({ id, name: values.name, color: values.color });
    });
  }

  /**
   * 删除一个标签, 条目上的这个标签一并摘掉, 条目本身不删除.
   * @param id 标签编号.
   * @returns 删除结果, 未解锁或没有这个编号时为失败结果.
   */
  remove(id: string): TagResult<undefined> {
    return this.withDatabase((orm) =>
      deleteTag(orm, id) ? tagSucceeded(undefined) : tagFailed("not-found"),
    );
  }

  /**
   * 在已解锁的数据库上执行一个操作, 未解锁与意外失败的处理见 `runWithDatabase`.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private withDatabase<Value>(
    operation: (orm: VaultOrm) => TagResult<Value>,
  ): TagResult<Value> {
    return runWithDatabase(this.dependencies, operation);
  }
}
