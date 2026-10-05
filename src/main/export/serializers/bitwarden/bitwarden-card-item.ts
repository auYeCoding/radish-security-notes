import { parseCardExpiry } from "./bitwarden-card-expiry";
import {
  fieldValueOf,
  orNull,
  type BitwardenMappingInput,
  type BitwardenTypedMapping,
} from "./bitwarden-mapping";
import { BITWARDEN_ITEM_TYPE } from "./bitwarden-types";

/**
 * 持卡人字段的键.
 */
const CARDHOLDER_FIELD_KEY = "cardholder";

/**
 * 卡号字段的键.
 */
const CARD_NUMBER_FIELD_KEY = "cardNumber";

/**
 * 有效期字段的键.
 */
const EXPIRY_FIELD_KEY = "expiry";

/**
 * 安全码字段的键.
 */
const SECURITY_CODE_FIELD_KEY = "securityCode";

/**
 * 把银行卡映射成 Bitwarden 卡: 持卡人, 卡号, 安全码对应写入, 有效期解析成月与年, 解析不了时不写,
 * 原文留在自定义字段里; 银行名称与 PIN 没有对应的属性, 也写成自定义字段, 卡组织留空.
 * @param input 映射输入.
 * @returns 映射结果.
 */
export function mapCardItem(
  input: BitwardenMappingInput,
): BitwardenTypedMapping {
  const { entry } = input;
  const expiry = parseCardExpiry(fieldValueOf(entry, EXPIRY_FIELD_KEY));
  const consumedKeys = [
    CARDHOLDER_FIELD_KEY,
    CARD_NUMBER_FIELD_KEY,
    SECURITY_CODE_FIELD_KEY,
    ...(expiry === undefined ? [] : [EXPIRY_FIELD_KEY]),
  ];
  return {
    type: BITWARDEN_ITEM_TYPE.card,
    typed: {
      card: {
        cardholderName: orNull(fieldValueOf(entry, CARDHOLDER_FIELD_KEY)),
        brand: null,
        number: orNull(fieldValueOf(entry, CARD_NUMBER_FIELD_KEY)),
        expMonth: expiry?.month ?? null,
        expYear: expiry?.year ?? null,
        code: orNull(fieldValueOf(entry, SECURITY_CODE_FIELD_KEY)),
      },
    },
    consumedKeys,
    notes: entry.notes,
  };
}
