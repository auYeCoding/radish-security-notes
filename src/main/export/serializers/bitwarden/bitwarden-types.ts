/**
 * Bitwarden 条目类型的取值: 登录, 安全笔记, 卡, 身份, SSH 密钥. 取自官方源码
 * `libs/common/src/vault/enums/cipher-type.ts`.
 */
export const BITWARDEN_ITEM_TYPE = {
  login: 1,
  secureNote: 2,
  card: 3,
  identity: 4,
  sshKey: 5,
} as const;

/**
 * Bitwarden 自定义字段类型的取值: 文本, 隐藏. 取自官方源码 `field-type.enum.ts`.
 */
export const BITWARDEN_FIELD_TYPE = {
  text: 0,
  hidden: 1,
} as const;

/**
 * Bitwarden 条目类型的取值之一.
 */
export type BitwardenItemType =
  (typeof BITWARDEN_ITEM_TYPE)[keyof typeof BITWARDEN_ITEM_TYPE];

/**
 * Bitwarden 自定义字段类型的取值之一.
 */
export type BitwardenFieldType =
  (typeof BITWARDEN_FIELD_TYPE)[keyof typeof BITWARDEN_FIELD_TYPE];

/**
 * Bitwarden 条目里的一个自定义字段.
 */
export interface BitwardenField {
  /**
   * 字段名.
   */
  readonly name: string;
  /**
   * 字段值.
   */
  readonly value: string;
  /**
   * 字段类型: 文本或隐藏.
   */
  readonly type: BitwardenFieldType;
  /**
   * 关联字段的编号, 导出不用关联类型, 恒为 null.
   */
  readonly linkedId: null;
}

/**
 * Bitwarden 登录条目里的一个网址.
 */
export interface BitwardenLoginUri {
  /**
   * 网址匹配方式, 导出不指定, 恒为 null.
   */
  readonly match: null;
  /**
   * 网址.
   */
  readonly uri: string;
}

/**
 * Bitwarden 安全笔记条目的笔记部分.
 */
export interface BitwardenSecureNote {
  /**
   * 笔记种类, 导出总是普通笔记, 恒为 0.
   */
  readonly type: 0;
}

/**
 * Bitwarden 登录条目的登录部分.
 */
export interface BitwardenLogin {
  /**
   * 网址列表.
   */
  readonly uris: readonly BitwardenLoginUri[];
  /**
   * 用户名.
   */
  readonly username: string | null;
  /**
   * 密码.
   */
  readonly password: string | null;
  /**
   * TOTP: Base32 密钥或 otpauth 链接.
   */
  readonly totp: string | null;
}

/**
 * Bitwarden 卡条目的卡部分, 全是字符串.
 */
export interface BitwardenCard {
  /**
   * 持卡人姓名.
   */
  readonly cardholderName: string | null;
  /**
   * 卡组织.
   */
  readonly brand: string | null;
  /**
   * 卡号.
   */
  readonly number: string | null;
  /**
   * 有效期的月.
   */
  readonly expMonth: string | null;
  /**
   * 有效期的年.
   */
  readonly expYear: string | null;
  /**
   * 安全码.
   */
  readonly code: string | null;
}

/**
 * Bitwarden 身份条目的身份部分.
 */
export interface BitwardenIdentity {
  /**
   * 称谓.
   */
  readonly title: string | null;
  /**
   * 名.
   */
  readonly firstName: string | null;
  /**
   * 中间名.
   */
  readonly middleName: string | null;
  /**
   * 姓.
   */
  readonly lastName: string | null;
  /**
   * 地址第一行.
   */
  readonly address1: string | null;
  /**
   * 地址第二行.
   */
  readonly address2: string | null;
  /**
   * 地址第三行.
   */
  readonly address3: string | null;
  /**
   * 城市.
   */
  readonly city: string | null;
  /**
   * 省或州.
   */
  readonly state: string | null;
  /**
   * 邮政编码.
   */
  readonly postalCode: string | null;
  /**
   * 国家.
   */
  readonly country: string | null;
  /**
   * 公司.
   */
  readonly company: string | null;
  /**
   * 邮箱.
   */
  readonly email: string | null;
  /**
   * 电话.
   */
  readonly phone: string | null;
  /**
   * 社保号.
   */
  readonly ssn: string | null;
  /**
   * 用户名.
   */
  readonly username: string | null;
  /**
   * 护照号.
   */
  readonly passportNumber: string | null;
  /**
   * 驾照号.
   */
  readonly licenseNumber: string | null;
}

/**
 * Bitwarden SSH 密钥条目的密钥部分.
 */
export interface BitwardenSshKey {
  /**
   * 私钥.
   */
  readonly privateKey: string;
  /**
   * 公钥.
   */
  readonly publicKey: string;
  /**
   * 密钥指纹, 本应用不存指纹, 写空串.
   */
  readonly keyFingerprint: string;
}

/**
 * 条目类型专属的部分: 登录, 安全笔记, 卡, 身份, SSH 密钥各占一个属性.
 */
export interface BitwardenTypedPart {
  /**
   * 登录部分.
   */
  readonly login?: BitwardenLogin;
  /**
   * 安全笔记部分, 导出总是普通笔记.
   */
  readonly secureNote?: BitwardenSecureNote;
  /**
   * 卡部分.
   */
  readonly card?: BitwardenCard;
  /**
   * 身份部分.
   */
  readonly identity?: BitwardenIdentity;
  /**
   * SSH 密钥部分.
   */
  readonly sshKey?: BitwardenSshKey;
}

/**
 * Bitwarden 导出 JSON 里的一个条目.
 */
export interface BitwardenItem extends BitwardenTypedPart {
  /**
   * 条目编号.
   */
  readonly id: string;
  /**
   * 所属组织, 个人库恒为 null.
   */
  readonly organizationId: null;
  /**
   * 所属文件夹的编号, 未分类时为 null.
   */
  readonly folderId: string | null;
  /**
   * 条目类型.
   */
  readonly type: BitwardenItemType;
  /**
   * 是否要求再次输入主密码才能查看, 恒为 0.
   */
  readonly reprompt: 0;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 备注.
   */
  readonly notes: string | null;
  /**
   * 是否收藏, 恒为 false.
   */
  readonly favorite: false;
  /**
   * 自定义字段, 没有时不写这个属性.
   */
  readonly fields?: readonly BitwardenField[];
  /**
   * 所属集合, 个人库恒为 null.
   */
  readonly collectionIds: null;
  /**
   * 密码历史, 本应用没有, 恒为 null.
   */
  readonly passwordHistory: null;
  /**
   * 修改时间, ISO 8601 文本.
   */
  readonly revisionDate: string;
  /**
   * 创建时间, ISO 8601 文本.
   */
  readonly creationDate: string;
  /**
   * 删除时间, 恒为 null.
   */
  readonly deletedDate: null;
}
