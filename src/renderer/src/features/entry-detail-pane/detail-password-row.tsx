import { useTranslation } from "react-i18next";

import { DetailSecretRow } from "./detail-secret-row";

/**
 * 详情密码行的属性.
 */
interface DetailPasswordRowProps {
  /**
   * 条目的密码.
   */
  readonly password: string;
  /**
   * 点击复制按钮时执行复制, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
}

/**
 * 详情里的密码行: 默认遮罩, 带显示与隐藏按钮和复制按钮. 没有填写密码时没有显示按钮,
 * 复制按钮禁用.
 * @param props 组件属性.
 * @returns 密码行元素.
 */
export function DetailPasswordRow(
  props: DetailPasswordRowProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <DetailSecretRow
      label={t("entryDetail.password")}
      value={props.password}
      copyLabel={t("entryDetail.copyPassword")}
      hiddenText={t("entryDetail.passwordHidden")}
      onCopy={props.onCopy}
    />
  );
}
