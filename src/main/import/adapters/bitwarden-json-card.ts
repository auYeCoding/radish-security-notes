import { BANK_CARD_TYPE } from "@shared/entries/preset-types/bank-card-type";

import { IMPORT_CUSTOM_FIELD_LABELS } from "../import-custom-field-labels";
import { customFieldIfFilled, isFilled } from "../import-draft-builders";
import type { TypedFragment } from "./bitwarden-json-fragment";
import { readRecord, readText, type JsonRecord } from "./json-values";

/**
 * 一位数的月份补成两位.
 */
const SINGLE_DIGIT_MONTH = /^\d$/;

/**
 * 把过期月份与年份拼成 "MM/YYYY": 月份是一位数时补零, 只有其中一项时只写那一项.
 * @param month 过期月份.
 * @param year 过期年份.
 * @returns 有效期文本.
 */
export function formatExpiry(month: string, year: string): string {
  const trimmedMonth = month.trim();
  const paddedMonth = SINGLE_DIGIT_MONTH.test(trimmedMonth)
    ? `0${trimmedMonth}`
    : trimmedMonth;
  return [paddedMonth, year.trim()].filter(isFilled).join("/");
}

/**
 * 把 Bitwarden 的卡 (type 3) 映射成银行卡类型: 持卡人, 卡号, 安全码直接对应, 有效期写成
 * MM/YYYY, 卡组织写成普通自定义字段 "卡组织".
 * @param item Bitwarden 条目.
 * @returns 银行卡类型的内容.
 */
export function mapBankCard(item: JsonRecord): TypedFragment {
  const card = readRecord(item, "card");
  return {
    typeKey: BANK_CARD_TYPE.key,
    fields: {
      cardholder: readText(card, "cardholderName"),
      cardNumber: readText(card, "number"),
      expiry: formatExpiry(
        readText(card, "expMonth"),
        readText(card, "expYear"),
      ),
      securityCode: readText(card, "code"),
    },
    notes: readText(item, "notes"),
    customFields: customFieldIfFilled(
      IMPORT_CUSTOM_FIELD_LABELS.cardBrand,
      readText(card, "brand"),
      false,
    ),
  };
}
