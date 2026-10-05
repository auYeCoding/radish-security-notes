import { DEFAULT_TAG_COLOR } from "@shared/tags/tag-colors";
import { foldForComparison } from "@shared/text/is-same-name";

import { insertFolder, listFolders } from "../folders/folder-repository";
import { insertTag, listTags } from "../tags/tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 新建文件夹与标签用到的依赖.
 */
export interface LabelWriterDependencies {
  /**
   * 生成新文件夹与新标签的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
}

/**
 * 按名称确保文件夹或标签存在后的结果.
 */
export interface EnsuredLabels {
  /**
   * 折叠后的名称到编号的映射, 含库里原有的与本次新建的.
   */
  readonly idsByName: ReadonlyMap<string, string>;
  /**
   * 本次新建的个数.
   */
  readonly createdCount: number;
}

/**
 * 库里已有的一个文件夹或标签的编号与名称.
 */
interface ExistingLabel {
  /**
   * 编号.
   */
  readonly id: string;
  /**
   * 名称.
   */
  readonly name: string;
}

/**
 * 按名称确保一类标签 (文件夹或标签) 存在: 库里已有同名的 (按本应用的同名规则) 沿用, 没有的新建.
 * @param existing 库里已有的 (名称, 编号) 列表.
 * @param names 本次导入用到的名称, 按首次出现的顺序排列.
 * @param create 新建一个的函数, 返回新编号.
 * @returns 折叠后的名称到编号的映射与新建的个数.
 */
function ensureNames(
  existing: readonly ExistingLabel[],
  names: readonly string[],
  create: (name: string) => string,
): EnsuredLabels {
  const idsByName = new Map(
    existing.map((label) => [foldForComparison(label.name), label.id]),
  );
  let createdCount = 0;
  for (const name of names) {
    const key = foldForComparison(name);
    if (!idsByName.has(key)) {
      idsByName.set(key, create(name));
      createdCount += 1;
    }
  }
  return { idsByName, createdCount };
}

/**
 * 在事务里确保导入用到的文件夹都存在, 缺的按创建顺序新建.
 * @param orm 事务.
 * @param names 导入用到的文件夹名称.
 * @param dependencies 编号与时间依赖.
 * @returns 名称到编号的映射与新建的个数.
 */
export function ensureFolders(
  orm: VaultOrm,
  names: readonly string[],
  dependencies: LabelWriterDependencies,
): EnsuredLabels {
  return ensureNames(listFolders(orm), names, (name) => {
    const id = dependencies.createIdentifier();
    insertFolder(orm, { id, name, createdAt: dependencies.now() });
    return id;
  });
}

/**
 * 在事务里确保导入用到的标签都存在, 缺的按创建顺序新建, 颜色取调色板的默认颜色.
 * @param orm 事务.
 * @param names 导入用到的标签名.
 * @param dependencies 编号与时间依赖.
 * @returns 名称到编号的映射与新建的个数.
 */
export function ensureTags(
  orm: VaultOrm,
  names: readonly string[],
  dependencies: LabelWriterDependencies,
): EnsuredLabels {
  return ensureNames(listTags(orm), names, (name) => {
    const id = dependencies.createIdentifier();
    insertTag(orm, {
      id,
      name,
      color: DEFAULT_TAG_COLOR,
      createdAt: dependencies.now(),
    });
    return id;
  });
}
