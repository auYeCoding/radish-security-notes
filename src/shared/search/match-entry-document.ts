import type { EntrySearchDocument } from "./entry-search-types";
import { foldText } from "./fold-text";
import { pinyinInitialsText } from "./pinyin-initials";
import {
  SEARCH_CUSTOM_FIELD_LABEL_FIELD,
  SEARCH_NAME_FIELD,
  SEARCH_NOTES_FIELD,
  SEARCH_TAG_FIELD,
  isPinyinSearchField,
  isSearchableFieldKey,
  type EntrySearchField,
} from "./search-fields";

/**
 * 一段参与搜索的文本: 属于哪个字段, 以及可以拿来比对关键字的规范化形式.
 */
interface SearchCandidate {
  /**
   * 文本所属的字段.
   */
  readonly field: EntrySearchField;
  /**
   * 规范化形式, 做拼音首字母匹配的字段多一个首字母串.
   */
  readonly forms: readonly string[];
}

/**
 * 为一段文本生成比对用的规范化形式.
 * @param field 文本所属的字段.
 * @param text 原文.
 * @returns 参与搜索的文本.
 */
function toCandidate(field: EntrySearchField, text: string): SearchCandidate {
  const folded = foldText(text);
  if (!isPinyinSearchField(field)) {
    return { field, forms: [folded] };
  }
  const initials = pinyinInitialsText(text);
  return { field, forms: initials === folded ? [folded] : [folded, initials] };
}

/**
 * 取出一个搜索文档里全部参与搜索的文本, 顺序是名称, 类型字段, 备注, 自定义字段名, 标签名. 类型
 * 字段只认参与搜索的字段键, 其它键即使出现在文档里也被忽略.
 * @param document 搜索文档.
 * @returns 参与搜索的文本.
 */
function candidatesOf(document: EntrySearchDocument): SearchCandidate[] {
  const typeFields = Object.entries(document.fields).flatMap(([key, value]) =>
    isSearchableFieldKey(key) ? [toCandidate(key, value)] : [],
  );
  return [
    toCandidate(SEARCH_NAME_FIELD, document.name),
    ...typeFields,
    toCandidate(SEARCH_NOTES_FIELD, document.notes),
    ...document.customFieldLabels.map((label) =>
      toCandidate(SEARCH_CUSTOM_FIELD_LABEL_FIELD, label),
    ),
    ...document.tagNames.map((name) => toCandidate(SEARCH_TAG_FIELD, name)),
  ];
}

/**
 * 判断一段文本是否包含关键字词.
 * @param candidate 参与搜索的文本.
 * @param term 规范化后的关键字词.
 * @returns 任一规范化形式包含该词时返回 true.
 */
function hasTerm(candidate: SearchCandidate, term: string): boolean {
  return candidate.forms.some((form) => form.includes(term));
}

/**
 * 判断一个条目是否命中全部关键字词: 每个词都至少命中一个参与搜索的字段, 不同的词可以命中不同
 * 字段. 命中的字段是所有词命中字段的并集.
 * @param document 搜索文档.
 * @param terms 规范化后的关键字词, 由 `parseSearchQuery` 得到.
 * @returns 命中的字段, 按名称, 类型字段, 备注, 自定义字段名, 标签名的顺序去重排列; 没有词或有词没命中任何字段时为 undefined.
 */
export function matchEntryDocument(
  document: EntrySearchDocument,
  terms: readonly string[],
): readonly EntrySearchField[] | undefined {
  if (terms.length === 0) {
    return undefined;
  }
  const candidates = candidatesOf(document);
  const hitFields = new Set<EntrySearchField>();
  for (const term of terms) {
    const hits = candidates.filter((candidate) => hasTerm(candidate, term));
    if (hits.length === 0) {
      return undefined;
    }
    hits.forEach((candidate) => hitFields.add(candidate.field));
  }
  return Array.from(
    new Set(candidates.map((candidate) => candidate.field)),
  ).filter((field) => hitFields.has(field));
}
