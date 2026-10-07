import { LockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 标题栏左侧的应用图标与名称.
 * @returns 应用名称元素.
 */
export function AppBrand(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-3 text-sm font-semibold">
      <LockIcon aria-hidden="true" className="size-4 text-brand" />
      {t("app.title")}
    </div>
  );
}
