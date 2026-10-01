import { useTranslation } from "react-i18next";

/**
 * 右侧的条目详情窗格. 现在只在中央显示未选择条目时的说明, 没有数据.
 * @returns 条目详情窗格元素.
 */
export function EntryDetailPane(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("entryDetailPane.empty")}
      className="flex min-w-0 flex-1 items-center justify-center p-8"
    >
      <p className="text-sm text-muted-foreground">
        {t("entryDetailPane.empty")}
      </p>
    </section>
  );
}
