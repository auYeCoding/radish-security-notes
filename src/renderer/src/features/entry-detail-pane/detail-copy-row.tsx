import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@renderer/components/copy-button";

import { DetailField, NotFilledText } from "./detail-field";

/**
 * 详情文本行的属性.
 */
interface DetailCopyRowProps {
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
   * 点击复制按钮时执行复制, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
  /**
   * 代替默认的原样文本显示值的内容, 例如渲染后的 Markdown; 值为空串时不使用, 复制按钮复制的仍是
   * `value`.
   */
  readonly renderedValue?: ReactNode;
  /**
   * 追加给值区域的类名, 例如换行方式.
   */
  readonly contentClassName?: string;
  /**
   * 复制按钮是否与值的顶部对齐, 默认与值垂直居中.
   */
  readonly isTopAligned?: boolean;
}

/**
 * 详情里一行带复制按钮的文本字段: 值按原有换行完整显示, 没有填写时显示辅助文字并禁用复制.
 * @param props 组件属性.
 * @returns 文本行元素.
 */
export function DetailCopyRow(props: DetailCopyRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const isEmpty = props.value === "";
  return (
    <DetailField
      label={props.label}
      contentClassName={props.contentClassName}
      isTopAligned={props.isTopAligned}
      actions={
        <CopyButton
          label={props.copyLabel}
          copiedLabel={t("entryDetail.copied")}
          onCopy={props.onCopy}
          isDisabled={isEmpty}
        />
      }
    >
      {isEmpty ? (
        <NotFilledText />
      ) : (
        (props.renderedValue ?? (
          <span className="whitespace-pre-wrap">{props.value}</span>
        ))
      )}
    </DetailField>
  );
}
