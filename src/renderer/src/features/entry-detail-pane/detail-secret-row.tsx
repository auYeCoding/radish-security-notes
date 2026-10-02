import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@renderer/components/copy-button";
import { RevealToggleButton } from "@renderer/components/reveal-toggle-button";

import { DetailField } from "./detail-field";
import { SecretValue } from "./secret-value";

/**
 * 详情遮罩行的属性.
 */
interface DetailSecretRowProps {
  /**
   * 字段名称.
   */
  readonly label: string;
  /**
   * 字段的值, 可以是多行文本, 没有填写时为空串.
   */
  readonly value: string;
  /**
   * 复制按钮的名称, 用作无障碍标签与悬停提示.
   */
  readonly copyLabel: string;
  /**
   * 遮罩时只给读屏软件读的文字, 例如 "密码已隐藏".
   */
  readonly hiddenText: string;
  /**
   * 点击复制按钮时执行复制, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
  /**
   * 已隐藏时显示按钮的名称, 不给时用密码的 "显示密码".
   */
  readonly showLabel?: string;
  /**
   * 已显示时隐藏按钮的名称, 不给时用密码的 "隐藏密码".
   */
  readonly hideLabel?: string;
}

/**
 * 详情里一行默认遮罩的字段: 带显示与隐藏按钮和复制按钮. 没有填写时没有显示按钮, 复制按钮
 * 禁用. 密码与隐藏的自定义字段共用.
 * @param props 组件属性.
 * @returns 遮罩行元素.
 */
export function DetailSecretRow(
  props: DetailSecretRowProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const [isRevealed, setIsRevealed] = useState(false);
  const isEmpty = props.value === "";
  return (
    <DetailField
      label={props.label}
      actions={
        <>
          {isEmpty ? null : (
            <RevealToggleButton
              isRevealed={isRevealed}
              onToggle={() => setIsRevealed(!isRevealed)}
              showLabel={props.showLabel}
              hideLabel={props.hideLabel}
            />
          )}
          <CopyButton
            label={props.copyLabel}
            copiedLabel={t("entryDetail.copied")}
            onCopy={props.onCopy}
            isDisabled={isEmpty}
          />
        </>
      }
    >
      <SecretValue
        value={props.value}
        isRevealed={isRevealed}
        hiddenText={props.hiddenText}
      />
    </DetailField>
  );
}
