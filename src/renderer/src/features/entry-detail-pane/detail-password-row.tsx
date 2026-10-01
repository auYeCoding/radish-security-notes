import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@renderer/components/copy-button";
import { RevealToggleButton } from "@renderer/components/reveal-toggle-button";

import { DetailField, NotFilledText } from "./detail-field";

/**
 * 密码遮罩时显示的圆点, 个数固定, 不暴露密码的长度.
 */
const MASKED_PASSWORD = "•".repeat(8);

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
 * 密码展示值的属性.
 */
interface PasswordValueProps {
  /**
   * 条目的密码.
   */
  readonly password: string;
  /**
   * 是否显示明文.
   */
  readonly isRevealed: boolean;
}

/**
 * 密码的展示值: 没有填写时是辅助文字, 默认是固定个数的圆点, 点击显示按钮后是明文.
 * @param props 密码与是否显示明文.
 * @returns 展示值元素.
 */
function PasswordValue(props: PasswordValueProps): React.JSX.Element {
  const { t } = useTranslation();
  if (props.password === "") {
    return <NotFilledText />;
  }
  if (props.isRevealed) {
    return <span className="font-mono">{props.password}</span>;
  }
  return (
    <>
      <span aria-hidden="true" className="font-mono">
        {MASKED_PASSWORD}
      </span>
      <span className="sr-only">{t("entryDetail.passwordHidden")}</span>
    </>
  );
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
  const [isRevealed, setIsRevealed] = useState(false);
  const isEmpty = props.password === "";
  return (
    <DetailField
      label={t("entryDetail.password")}
      actions={
        <>
          {isEmpty ? null : (
            <RevealToggleButton
              isRevealed={isRevealed}
              onToggle={() => setIsRevealed(!isRevealed)}
            />
          )}
          <CopyButton
            label={t("entryDetail.copyPassword")}
            copiedLabel={t("entryDetail.copied")}
            onCopy={props.onCopy}
            isDisabled={isEmpty}
          />
        </>
      }
    >
      <PasswordValue password={props.password} isRevealed={isRevealed} />
    </DetailField>
  );
}
