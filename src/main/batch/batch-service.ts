import {
  batchFailed,
  batchSucceeded,
  type BatchFailure,
  type BatchResult,
} from "@shared/batch/batch-result";
import type { EntryTagAssignment } from "@shared/batch/entry-tag-assignment";
import { appendTagId, wouldExceedTagLimit } from "@shared/batch/tag-append";
import { withoutTagId } from "@shared/tags/tag-filter";

import { isFolderChoiceValid } from "../folders/folder-repository";
import { areAllTagsExisting } from "../tags/entry-tag-repository";
import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  countExistingEntries,
  deleteEntriesByIds,
  setFolderOfEntries,
} from "./batch-entry-repository";
import {
  listTagIdsOfEntries,
  replaceTagsOfEntries,
} from "./batch-tag-repository";

/**
 * 对一个条目带的标签做的一种改动: 先判断是否被拦下, 再算出改动后的标签.
 */
interface TagChange {
  /**
   * 判断这种改动是否被拦下, 例如追加标签会超过上限.
   * @param own 条目现在带的标签编号.
   * @returns 被拦下时返回 true.
   */
  readonly isBlocked: (own: readonly string[]) => boolean;
  /**
   * 算出改动后条目带的标签.
   * @param own 条目现在带的标签编号.
   * @returns 改动后的标签编号, 没有变化时是同一个数组.
   */
  readonly apply: (own: readonly string[]) => readonly string[];
}

/**
 * 去掉编号里的重复项, 保持首次出现的顺序.
 * @param ids 编号列表.
 * @returns 互不重复的编号.
 */
function uniqueIds(ids: readonly string[]): readonly string[] {
  return Array.from(new Set(ids));
}

/**
 * 检查整批条目: 至少有一个, 并且全部存在.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param ids 互不重复的条目编号.
 * @returns 检查不通过时为失败结果, 通过时为 undefined.
 */
function checkEntries(
  orm: VaultOrm,
  ids: readonly string[],
): BatchFailure | undefined {
  if (ids.length === 0) {
    return batchFailed("invalid-input");
  }
  return countExistingEntries(orm, ids) === ids.length
    ? undefined
    : batchFailed("not-found");
}

/**
 * 批量服务: 在已解锁的加密数据库里一次删除, 移入文件夹, 加标签或摘标签多个条目. 每个操作的校验与
 * 写入都在同一个数据库事务里完成, 校验不通过时不写入, 写入中途出错时整个事务回滚, 所以失败时
 * 整批都不生效. 服务只经手条目, 文件夹与标签的编号, 不读取也不返回条目的字段内容.
 */
export class BatchService {
  /**
   * 创建批量服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: DatabaseAccess) {}

  /**
   * 一次删除多个条目, 条目带的标签关联随之由外键级联清除.
   * @param entryIds 要删除的条目编号.
   * @returns 删除结果, 未解锁, 没有编号, 有条目不存在或数据库出错时为失败结果.
   */
  removeEntries(entryIds: readonly string[]): BatchResult<undefined> {
    return this.inTransaction((orm) => {
      const ids = uniqueIds(entryIds);
      const failure = checkEntries(orm, ids);
      if (failure !== undefined) {
        return failure;
      }
      deleteEntriesByIds(orm, ids);
      return batchSucceeded(undefined);
    });
  }

  /**
   * 一次把多个条目放进文件夹, 或移出文件夹回到未分类.
   * @param entryIds 要移动的条目编号.
   * @param folderId 目标文件夹编号, 移回未分类时为 undefined.
   * @returns 移动结果, 未解锁, 没有编号, 有条目不存在, 目标文件夹不存在或数据库出错时为失败结果.
   */
  moveEntries(
    entryIds: readonly string[],
    folderId: string | undefined,
  ): BatchResult<undefined> {
    return this.inTransaction((orm) => {
      const ids = uniqueIds(entryIds);
      const failure = checkEntries(orm, ids);
      if (failure !== undefined) {
        return failure;
      }
      if (!isFolderChoiceValid(orm, folderId)) {
        return batchFailed("folder-not-found");
      }
      setFolderOfEntries(orm, ids, folderId ?? null);
      return batchSucceeded(undefined);
    });
  }

  /**
   * 给多个条目各追加一个标签: 追加在条目原有标签之后, 条目已带它时保持不变. 任何一个条目追加后
   * 会超过标签数上限时整批失败.
   * @param entryIds 要加标签的条目编号.
   * @param tagId 要追加的标签编号.
   * @returns 每个条目现在带的标签, 未解锁, 没有编号, 有条目不存在, 标签不存在, 超过上限或数据库
   * 出错时为失败结果.
   */
  addTag(
    entryIds: readonly string[],
    tagId: string,
  ): BatchResult<readonly EntryTagAssignment[]> {
    return this.changeTag(entryIds, tagId, {
      isBlocked: (own) => wouldExceedTagLimit(own, tagId),
      apply: (own) => appendTagId(own, tagId),
    });
  }

  /**
   * 从多个条目上各摘掉一个标签, 条目没有这个标签时保持不变.
   * @param entryIds 要摘标签的条目编号.
   * @param tagId 要摘掉的标签编号.
   * @returns 每个条目现在带的标签, 未解锁, 没有编号, 有条目不存在, 标签不存在或数据库出错时为
   * 失败结果.
   */
  removeTag(
    entryIds: readonly string[],
    tagId: string,
  ): BatchResult<readonly EntryTagAssignment[]> {
    return this.changeTag(entryIds, tagId, {
      isBlocked: () => false,
      apply: (own) => withoutTagId(own, tagId),
    });
  }

  /**
   * 在一个事务里对多个条目的标签做同一种改动, 只改写标签有变化的条目.
   * @param entryIds 条目编号.
   * @param tagId 改动涉及的标签编号, 必须存在.
   * @param change 对每个条目带的标签做的改动.
   * @returns 每个条目改动后带的标签, 或失败结果.
   */
  private changeTag(
    entryIds: readonly string[],
    tagId: string,
    change: TagChange,
  ): BatchResult<readonly EntryTagAssignment[]> {
    return this.inTransaction((orm) => {
      const ids = uniqueIds(entryIds);
      const failure = checkEntries(orm, ids);
      if (failure !== undefined) {
        return failure;
      }
      if (!areAllTagsExisting(orm, [tagId])) {
        return batchFailed("tag-not-found");
      }
      const before = listTagIdsOfEntries(orm, ids);
      const owns = ids.map((entryId) => before.get(entryId) ?? []);
      if (owns.some((own) => change.isBlocked(own))) {
        return batchFailed("tag-limit-exceeded");
      }
      const after = ids.map((entryId, index) => ({
        entryId,
        tagIds: change.apply(owns[index] ?? []),
      }));
      replaceTagsOfEntries(
        orm,
        after.filter((assignment, index) => assignment.tagIds !== owns[index]),
      );
      return batchSucceeded(after);
    });
  }

  /**
   * 在已解锁数据库的一个事务里执行一个批量操作. 操作返回失败结果时事务不写入任何内容, 操作
   * 抛出错误时事务回滚, 未解锁与意外失败的处理见 `runWithDatabase`.
   * @param operation 要执行的操作, 参数是事务.
   * @returns 操作结果.
   */
  private inTransaction<Value>(
    operation: (orm: VaultOrm) => BatchResult<Value>,
  ): BatchResult<Value> {
    return runWithDatabase(this.dependencies, (orm) =>
      orm.transaction((transaction) => operation(transaction)),
    );
  }
}
