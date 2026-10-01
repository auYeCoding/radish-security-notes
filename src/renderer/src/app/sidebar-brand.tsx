import { LockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 侧栏顶部的应用名称与图标.
 * @returns 应用名称元素.
 */
export function SidebarBrand(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold">
      <LockIcon aria-hidden="true" className="size-5 text-brand" />
      {t("app.title")}
    </div>
  );
}
