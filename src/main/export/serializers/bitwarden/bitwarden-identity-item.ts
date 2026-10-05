import {
  fieldValueOf,
  orNull,
  type BitwardenMappingInput,
  type BitwardenTypedMapping,
} from "./bitwarden-mapping";
import { BITWARDEN_ITEM_TYPE, type BitwardenIdentity } from "./bitwarden-types";

/**
 * 全名字段的键.
 */
const FULL_NAME_FIELD_KEY = "fullName";

/**
 * 邮箱字段的键.
 */
const EMAIL_FIELD_KEY = "email";

/**
 * 电话字段的键.
 */
const PHONE_FIELD_KEY = "phone";

/**
 * 地址字段的键.
 */
const ADDRESS_FIELD_KEY = "address";

/**
 * 一个什么都没填的 Bitwarden 身份.
 */
const EMPTY_IDENTITY: BitwardenIdentity = {
  title: null,
  firstName: null,
  middleName: null,
  lastName: null,
  address1: null,
  address2: null,
  address3: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  company: null,
  email: null,
  phone: null,
  ssn: null,
  username: null,
  passportNumber: null,
  licenseNumber: null,
};

/**
 * 把身份映射成 Bitwarden 身份: 全名整体进名 (Bitwarden 显示时把名, 中间名, 姓用空格连起来, 整体
 * 放进名不会改变显示, 也不会把中文名从中间切开), 邮箱与电话对应写入, 地址整体进地址第一行;
 * 证件号码没有确定对应的属性 (护照, 驾照, 社保号分不清), 写成自定义字段.
 * @param input 映射输入.
 * @returns 映射结果.
 */
export function mapIdentityItem(
  input: BitwardenMappingInput,
): BitwardenTypedMapping {
  const { entry } = input;
  return {
    type: BITWARDEN_ITEM_TYPE.identity,
    typed: {
      identity: {
        ...EMPTY_IDENTITY,
        firstName: orNull(fieldValueOf(entry, FULL_NAME_FIELD_KEY)),
        email: orNull(fieldValueOf(entry, EMAIL_FIELD_KEY)),
        phone: orNull(fieldValueOf(entry, PHONE_FIELD_KEY)),
        address1: orNull(fieldValueOf(entry, ADDRESS_FIELD_KEY)),
      },
    },
    consumedKeys: [
      FULL_NAME_FIELD_KEY,
      EMAIL_FIELD_KEY,
      PHONE_FIELD_KEY,
      ADDRESS_FIELD_KEY,
    ],
    notes: entry.notes,
  };
}
