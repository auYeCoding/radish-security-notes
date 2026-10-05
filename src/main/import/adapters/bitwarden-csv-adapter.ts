import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";
import { SECURE_NOTE_TYPE } from "@shared/entries/preset-types/secure-note-type";
import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";

import { createCsvAdapter } from "../csv-source-adapter";
import { emptyDraft, isFilled, splitUrls } from "../import-draft-builders";
import type {
  ImportedEntryDraft,
  ImportSourceAdapter,
  SourceLoss,
} from "../source-adapter";

/**
 * Bitwarden 个人库 CSV 里类型列表示安全笔记的取值, 其余取值都按登录处理.
 */
const NOTE_TYPE_VALUE = "note";

/**
 * 自定义字段单元格里名称与值之间的分隔, 导出时写成 "名称: 值".
 */
const FIELD_SEPARATOR = ": ";

/**
 * Bitwarden CSV 里多个网址之间的分隔符.
 */
const URI_SEPARATOR = ",";

/**
 * 判断单元格表示 "是": 非空且不是 "0".
 * @param value 单元格文本.
 * @returns 表示 "是" 时返回 true.
 */
function isTruthyCell(value: string | undefined): boolean {
  const text = (value ?? "").trim();
  return text.length > 0 && text !== "0";
}

/**
 * 拆开 fields 单元格的结果.
 */
interface ParsedFieldsCell {
  /**
   * 拆出的自定义字段.
   */
  readonly customFields: readonly NewCustomFieldInput[];
  /**
   * 带不进的行对应的损失.
   */
  readonly losses: readonly SourceLoss[];
}

/**
 * 把 fields 单元格拆成自定义字段: 每行一个 "名称: 值", 按第一个 ": " 切开; CSV 不带字段类型, 一律
 * 当普通文本. 没有 ": " 的行无法拆成名称与值, 记为带不进的内容 (清单里不含这一行的文本).
 * @param cell fields 单元格文本.
 * @returns 自定义字段与带不进的行对应的损失.
 */
function parseFieldsCell(cell: string): ParsedFieldsCell {
  const customFields: NewCustomFieldInput[] = [];
  const losses: SourceLoss[] = [];
  for (const line of cell.split(/\r?\n/)) {
    if (!isFilled(line)) {
      continue;
    }
    const position = line.indexOf(FIELD_SEPARATOR);
    if (position < 0) {
      losses.push({ reason: "unparsable-field-line" });
    } else {
      customFields.push({
        label: line.slice(0, position),
        value: line.slice(position + FIELD_SEPARATOR.length),
        isHidden: false,
      });
    }
  }
  return { customFields, losses };
}

/**
 * 收集这一行带不进的内容: 收藏, 重新提示, 归档.
 * @param record 一行记录.
 * @returns 损失列表.
 */
function collectLosses(
  record: Readonly<Record<string, string>>,
): readonly SourceLoss[] {
  const losses: SourceLoss[] = [];
  if (isTruthyCell(record.favorite)) {
    losses.push({ reason: "favorite-unsupported" });
  }
  if (isTruthyCell(record.reprompt)) {
    losses.push({ reason: "reprompt-unsupported" });
  }
  if (isFilled(record.archivedDate ?? "")) {
    losses.push({ reason: "archived-unsupported" });
  }
  return losses;
}

/**
 * 把 Bitwarden 个人库 CSV 的一行映射成草稿: 类型是 note 的成为安全笔记, 其余成为登录; 网址按逗号
 * 拆开, 第一个进网址, 其余写成自定义字段; 反斜杠分层的文件夹改成斜杠.
 * @param record 一行记录.
 * @returns 草稿.
 */
function mapRecord(
  record: Readonly<Record<string, string>>,
): ImportedEntryDraft {
  const isNote = record.type.trim().toLowerCase() === NOTE_TYPE_VALUE;
  const base = emptyDraft(
    record.name,
    isNote ? SECURE_NOTE_TYPE.key : LOGIN_TYPE.key,
  );
  const parsedFields = parseFieldsCell(record.fields ?? "");
  const urls = splitUrls(
    record.login_uri
      .split(URI_SEPARATOR)
      .filter(isFilled)
      .map((url) => url.trim()),
  );
  const losses = [...collectLosses(record), ...parsedFields.losses];
  const folderPath = (record.folder ?? "").replaceAll("\\", "/");
  if (isNote) {
    return {
      ...base,
      fields: { content: record.notes ?? "" },
      customFields: parsedFields.customFields,
      folderPath,
      losses,
    };
  }
  return {
    ...base,
    fields: {
      account: record.login_username,
      password: record.login_password,
      url: urls.url,
    },
    notes: record.notes ?? "",
    customFields: [...urls.extras, ...parsedFields.customFields],
    totp: record.login_totp ?? "",
    folderPath,
    losses,
  };
}

/**
 * Bitwarden 个人库 CSV 的适配器. 表头区分大小写, 个人库导出带 folder 与 favorite 列; 组织库导出
 * 的表头是 collections, 不支持. CSV 只含登录与安全笔记, 银行卡, 身份等类型只能用 JSON 导出.
 */
export const bitwardenCsvAdapter: ImportSourceAdapter = createCsvAdapter({
  key: "bitwardenCsv",
  requiredColumns: [
    "type",
    "name",
    "login_uri",
    "login_username",
    "login_password",
  ],
  rejectedColumns: [
    { column: "collections", reason: "organization-export-unsupported" },
  ],
  mapRecord,
});
