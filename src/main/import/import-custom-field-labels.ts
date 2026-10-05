/**
 * 来源里没有对应字段的内容写成自定义字段时用的字段名. 这些名称写进用户的条目, 是数据而不是界面
 * 文案, 不随界面语言变化.
 */
export const IMPORT_CUSTOM_FIELD_LABELS = {
  extraUrlPrefix: "网址",
  cardBrand: "卡组织",
  identityTitle: "称谓",
  identityCompany: "公司",
  identityUsername: "用户名",
  passportNumber: "护照号",
  licenseNumber: "驾照号",
  socialSecurityNumber: "社保号",
  sshFingerprint: "指纹",
  httpRealm: "HTTP 认证域",
} as const;

/**
 * 多个网址里第二个起的网址写成自定义字段时的字段名, 序号从 2 起.
 * @param position 网址在来源里的位置, 从 1 起, 第 1 个进网址字段, 所以这里从 2 起.
 * @returns 字段名, 例如 "网址 2".
 */
export function extraUrlLabel(position: number): string {
  return `${IMPORT_CUSTOM_FIELD_LABELS.extraUrlPrefix} ${position}`;
}
