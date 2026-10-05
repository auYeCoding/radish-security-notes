import {
  fieldValueOf,
  type BitwardenMappingInput,
  type BitwardenTypedMapping,
} from "./bitwarden-mapping";
import { BITWARDEN_ITEM_TYPE } from "./bitwarden-types";

/**
 * 安全笔记正文字段的键.
 */
const CONTENT_FIELD_KEY = "content";

/**
 * 把安全笔记映射成 Bitwarden 安全笔记: 正文进备注, 条目自己的备注非空时空一行接在后面.
 * @param input 映射输入.
 * @returns 映射结果.
 */
export function mapNoteItem(
  input: BitwardenMappingInput,
): BitwardenTypedMapping {
  const { entry } = input;
  const content = fieldValueOf(entry, CONTENT_FIELD_KEY);
  const notes =
    content !== "" && entry.notes !== ""
      ? `${content}\n\n${entry.notes}`
      : `${content}${entry.notes}`;
  return {
    type: BITWARDEN_ITEM_TYPE.secureNote,
    typed: { secureNote: { type: 0 } },
    consumedKeys: [CONTENT_FIELD_KEY],
    notes,
  };
}
