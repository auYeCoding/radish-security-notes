import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import { TAG_NAME_MAX_LENGTH } from "@shared/tags/tag-name-schema";
import { isSameName } from "@shared/text/is-same-name";
import { isWithinLength } from "@shared/text/is-within-length";

import type { SourceLoss } from "./source-adapter";

/**
 * 规整后的条目标签.
 */
export interface NormalizedTagNames {
  /**
   * 能带入的标签名, 互不重复, 不超过每个条目的标签上限.
   */
  readonly tagNames: readonly string[];
  /**
   * 带不进的标签对应的损失.
   */
  readonly losses: readonly SourceLoss[];
}

/**
 * 判断标签名是否已经在列表里 (按本应用的同名规则).
 * @param names 已有的标签名.
 * @param candidate 待判断的标签名.
 * @returns 已有同名标签时返回 true.
 */
function containsSameName(
  names: readonly string[],
  candidate: string,
): boolean {
  return names.some((name) => isSameName(name, candidate));
}

/**
 * 把来源条目的标签名规整成本应用的标签: 去首尾空格并丢掉空名与重名, 名称超过字符上限的带不进,
 * 超过每个条目的标签上限的后面几个带不进.
 * @param names 来源条目上的标签名.
 * @returns 能带入的标签名与带不进的标签对应的损失.
 */
export function normalizeTagNames(
  names: readonly string[],
): NormalizedTagNames {
  const tagNames: string[] = [];
  const losses: SourceLoss[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (name.length === 0 || containsSameName(tagNames, name)) {
      continue;
    }
    if (!isWithinLength(name, TAG_NAME_MAX_LENGTH)) {
      losses.push({ reason: "tag-name-invalid", fieldName: name });
    } else if (tagNames.length >= MAX_TAGS_PER_ENTRY) {
      losses.push({ reason: "tag-limit-exceeded", fieldName: name });
    } else {
      tagNames.push(name);
    }
  }
  return { tagNames, losses };
}
