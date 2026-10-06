import { createFolderNameSchema } from "@shared/folders/folder-name-schema";
import type { RestoreProblem } from "@shared/restore/restore-problem";
import { createTagFormSchema } from "@shared/tags/tag-name-schema";

import type {
  NativeFolderDocument,
  NativeTagDocument,
} from "../export/serializers/native/native-format-types";
import { checkNamedItems } from "./restore-named-items-check";

/**
 * 判断文件夹名称是否合规且已是规范形式: 去首尾空格后 1 至 50 个字符, 且没有多余的首尾空格, 这样
 * 写进库的就是备份里的原值.
 * @param folder 文件夹.
 * @returns 合规时为 true.
 */
function isFolderNameValid(folder: NativeFolderDocument): boolean {
  const parsed = createFolderNameSchema().safeParse({ name: folder.name });
  return parsed.success && parsed.data.name === folder.name;
}

/**
 * 判断标签名称是否合规且已是规范形式.
 * @param tag 标签.
 * @returns 合规时为 true.
 */
function isTagNameValid(tag: NativeTagDocument): boolean {
  const parsed = createTagFormSchema().safeParse({
    name: tag.name,
    color: tag.color,
  });
  return parsed.success && parsed.data.name === tag.name;
}

/**
 * 校验文件夹: 编号互不重复, 名称合规且互不重名.
 * @param folders 备份里的文件夹.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
export function validateFolders(
  folders: readonly NativeFolderDocument[],
): RestoreProblem | undefined {
  return checkNamedItems("folders", folders, isFolderNameValid);
}

/**
 * 校验标签: 编号互不重复, 名称合规且互不重名, 颜色已在结构校验里限定在调色板内.
 * @param tags 备份里的标签.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
export function validateTags(
  tags: readonly NativeTagDocument[],
): RestoreProblem | undefined {
  return checkNamedItems("tags", tags, isTagNameValid);
}
