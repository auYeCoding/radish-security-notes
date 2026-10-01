import { useTranslation } from "react-i18next";

import { DetailCopyRow } from "./detail-copy-row";
import { DetailSecretRow } from "./detail-secret-row";

/**
 * 详情值行的属性.
 */
interface DetailValueRowProps {
  /**
   * 字段名称, 已是当前语言的文案或用户填写的字段名.
   */
  readonly label: string;
  /**
   * 字段的值, 可以是多行文本, 没有填写时为空串.
   */
  readonly value: string;
  /**
   * 是否是敏感字段, 敏感字段默认遮罩并带显示与隐藏按钮.
   */
  readonly isSensitive: boolean;
  /**
   * 点击复制按钮时执行复制, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
}

/**
 * 详情里一个字段的一行: 敏感字段默认遮罩, 带显示与隐藏按钮和复制按钮, 复制不必先显示;
 * 普通字段明文显示, 带复制按钮. 复制与显示按钮的名称都带字段名. 类型字段, 自定义字段与
 * 备注共用.
 * @param props 组件属性.
 * @returns 值行元素.
 */
export function DetailValueRow(props: DetailValueRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { label } = props;
  const copyLabel = t("entryDetail.copyField", { label });
  if (!props.isSensitive) {
    return (
      <DetailCopyRow
        label={label}
        value={props.value}
        copyLabel={copyLabel}
        onCopy={props.onCopy}
      />
    );
  }
  return (
    <DetailSecretRow
      label={label}
      value={props.value}
      copyLabel={copyLabel}
      hiddenText={t("entryDetail.fieldHidden", { label })}
      showLabel={t("entryDetail.showField", { label })}
      hideLabel={t("entryDetail.hideField", { label })}
      onCopy={props.onCopy}
    />
  );
}
