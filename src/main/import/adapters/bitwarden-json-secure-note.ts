import { SECURE_NOTE_TYPE } from "@shared/entries/preset-types/secure-note-type";

import type { TypedFragment } from "./bitwarden-json-fragment";
import { readText, type JsonRecord } from "./json-values";

/**
 * 把 Bitwarden 的安全笔记 (type 2) 映射成安全笔记类型: 笔记正文写进 "内容" 字段, 备注留空.
 * @param item Bitwarden 条目.
 * @returns 安全笔记类型的内容.
 */
export function mapSecureNote(item: JsonRecord): TypedFragment {
  return {
    typeKey: SECURE_NOTE_TYPE.key,
    fields: { content: readText(item, "notes") },
  };
}
