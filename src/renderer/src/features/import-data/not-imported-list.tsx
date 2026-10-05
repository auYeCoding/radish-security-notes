import { useTranslation } from "react-i18next";

import type { NotImportedItem } from "@shared/import/import-reasons";

import { ScrollArea } from "@renderer/components/ui/scroll-area";

import { describeNotImportedItem } from "./describe-not-imported-item";

/**
 * 结果页里最多显示多少项未能带入的内容, 更多的靠保存为文本文件查看, 避免一次渲染几千行.
 */
export const NOT_IMPORTED_DISPLAY_LIMIT = 500;

/**
 * 未能带入清单的属性.
 */
interface NotImportedListProps {
  /**
   * 完整的未能带入清单.
   */
  readonly items: readonly NotImportedItem[];
}

/**
 * 未能带入内容的清单: 标题带总数, 下面是可滚动的列表, 每项是对象与名称加字段与原因, 项数超过显示
 * 上限时只显示前面的并说明. 清单里没有任何保密值; 没有未能带入的内容时只说明这一点.
 * @param props 组件属性.
 * @returns 清单元素.
 */
export function NotImportedList(
  props: NotImportedListProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const shown = props.items.slice(0, NOT_IMPORTED_DISPLAY_LIMIT);
  if (props.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("import.result.notImported.empty")}
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        {t("import.result.notImported.heading", { count: props.items.length })}
      </h3>
      <ScrollArea className="h-56 rounded-lg border border-border">
        <ul className="flex flex-col divide-y divide-border">
          {shown.map((item, index) => {
            const described = describeNotImportedItem(item, t);
            return (
              <li
                key={index}
                className="flex flex-col gap-0.5 px-3 py-2 text-sm"
              >
                <span className="font-medium break-words">
                  {described.heading}
                </span>
                <span className="text-muted-foreground">
                  {described.detail}
                </span>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      {props.items.length > shown.length && (
        <p className="text-sm text-muted-foreground">
          {t("import.result.notImported.truncated", { shown: shown.length })}
        </p>
      )}
    </section>
  );
}
