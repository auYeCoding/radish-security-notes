import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 银行卡类型: 持卡人, 银行, 卡号, 有效期, 安全码, 取款密码, 其中卡号, 安全码与取款密码敏感.
 */
export const BANK_CARD_TYPE = defineEntryType("bankCard", [
  defineField("cardholder"),
  defineField("bankName"),
  defineField("cardNumber", { isSensitive: true }),
  defineField("expiry"),
  defineField("securityCode", { isSensitive: true }),
  defineField("cardPin", { isSensitive: true }),
]);
