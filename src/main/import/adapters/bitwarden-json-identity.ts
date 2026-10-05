import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";
import { IDENTITY_TYPE } from "@shared/entries/preset-types/identity-type";

import { IMPORT_CUSTOM_FIELD_LABELS } from "../import-custom-field-labels";
import { customFieldIfFilled, isFilled } from "../import-draft-builders";
import type { TypedFragment } from "./bitwarden-json-fragment";
import { readRecord, readText, type JsonRecord } from "./json-values";

/**
 * 证件号码的来源: 字段名与它在没有被选为 "证件号码" 时写成隐藏自定义字段用的名称, 按取用的先后
 * 顺序排列.
 */
const DOCUMENT_NUMBER_SOURCES = [
  { key: "passportNumber", label: IMPORT_CUSTOM_FIELD_LABELS.passportNumber },
  { key: "licenseNumber", label: IMPORT_CUSTOM_FIELD_LABELS.licenseNumber },
  { key: "ssn", label: IMPORT_CUSTOM_FIELD_LABELS.socialSecurityNumber },
] as const;

/**
 * 去掉空文本后用给定的分隔符连接.
 * @param parts 文本列表.
 * @param separator 分隔符.
 * @returns 连接后的文本, 全空时为空串.
 */
function joinFilled(parts: readonly string[], separator: string): string {
  return parts
    .map((part) => part.trim())
    .filter(isFilled)
    .join(separator);
}

/**
 * 把地址的各部分拼成多行文本: 地址一到三各占一行, 城市, 州与邮编占一行, 国家占一行.
 * @param identity Bitwarden 条目的 identity 对象.
 * @returns 地址文本.
 */
function formatAddress(identity: JsonRecord): string {
  const region = joinFilled(
    [
      readText(identity, "city"),
      readText(identity, "state"),
      readText(identity, "postalCode"),
    ],
    " ",
  );
  return joinFilled(
    [
      readText(identity, "address1"),
      readText(identity, "address2"),
      readText(identity, "address3"),
      region,
      readText(identity, "country"),
    ],
    "\n",
  );
}

/**
 * 三项证件号码的处理结果.
 */
interface MappedDocumentNumbers {
  /**
   * 作为 "证件号码" 字段的值, 三项都为空时为空串.
   */
  readonly documentNumber: string;
  /**
   * 其余非空的证件号码对应的隐藏自定义字段.
   */
  readonly hiddenFields: readonly NewCustomFieldInput[];
}

/**
 * 处理三项证件号码: 护照号, 驾照号, 社保号中第一个非空的作 "证件号码", 其余非空的写成隐藏自定义
 * 字段.
 * @param identity Bitwarden 条目的 identity 对象.
 * @returns 证件号码与其余证件号码对应的隐藏自定义字段.
 */
function mapDocumentNumbers(identity: JsonRecord): MappedDocumentNumbers {
  const filled = DOCUMENT_NUMBER_SOURCES.map((source) => ({
    label: source.label,
    value: readText(identity, source.key),
  })).filter((candidate) => isFilled(candidate.value));
  const [first, ...rest] = filled;
  return {
    documentNumber: first?.value ?? "",
    hiddenFields: rest.flatMap((candidate) =>
      customFieldIfFilled(candidate.label, candidate.value, true),
    ),
  };
}

/**
 * 把 Bitwarden 的身份 (type 4) 映射成身份类型: 名, 中间名, 姓用空格连成全名, 邮箱与电话直接对应,
 * 地址多行拼接, 证件号码取第一个非空的证件号, 其余证件号写成隐藏自定义字段, 称谓, 公司, 用户名
 * 写成普通自定义字段.
 * @param item Bitwarden 条目.
 * @returns 身份类型的内容.
 */
export function mapIdentity(item: JsonRecord): TypedFragment {
  const identity = readRecord(item, "identity");
  const documents = mapDocumentNumbers(identity);
  return {
    typeKey: IDENTITY_TYPE.key,
    fields: {
      fullName: joinFilled(
        [
          readText(identity, "firstName"),
          readText(identity, "middleName"),
          readText(identity, "lastName"),
        ],
        " ",
      ),
      email: readText(identity, "email"),
      phone: readText(identity, "phone"),
      documentNumber: documents.documentNumber,
      address: formatAddress(identity),
    },
    notes: readText(item, "notes"),
    customFields: [
      ...customFieldIfFilled(
        IMPORT_CUSTOM_FIELD_LABELS.identityTitle,
        readText(identity, "title"),
        false,
      ),
      ...customFieldIfFilled(
        IMPORT_CUSTOM_FIELD_LABELS.identityCompany,
        readText(identity, "company"),
        false,
      ),
      ...customFieldIfFilled(
        IMPORT_CUSTOM_FIELD_LABELS.identityUsername,
        readText(identity, "username"),
        false,
      ),
      ...documents.hiddenFields,
    ],
  };
}
