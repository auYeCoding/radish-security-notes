import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@renderer/lib/class-names";

/**
 * 详情字段行的属性.
 */
interface DetailFieldProps {
  /**
   * 字段名称.
   */
  readonly label: string;
  /**
   * 字段的值.
   */
  readonly children: ReactNode;
  /**
   * 值右侧的操作按钮, 例如显示与隐藏, 复制.
   */
  readonly actions?: ReactNode;
  /**
   * 追加给值区域的类名, 与默认类名冲突时以它为准, 例如换行方式.
   */
  readonly contentClassName?: string;
  /**
   * 操作按钮是否与值的顶部对齐, 默认与值垂直居中; 值很高时 (例如渲染后的 Markdown) 对齐顶部更清楚.
   */
  readonly isTopAligned?: boolean;
}

/**
 * 详情里的一行字段: 上方是字段名称, 下方左侧是值, 右侧是操作按钮.
 * @param props 组件属性.
 * @returns 字段行元素.
 */
export function DetailField(props: DetailFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs break-all text-muted-foreground">{props.label}</dt>
      <dd
        className={cn(
          "flex gap-2",
          props.isTopAligned === true ? "items-start" : "items-center",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 text-sm break-all",
            props.contentClassName,
          )}
        >
          {props.children}
        </div>
        {props.actions}
      </dd>
    </div>
  );
}

/**
 * 字段没有填写时代替值显示的辅助文字.
 * @returns 辅助文字元素.
 */
export function NotFilledText(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="text-muted-foreground">{t("entryDetail.notFilled")}</span>
  );
}
