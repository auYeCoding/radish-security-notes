import { SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

/**
 * 侧栏底部的设置按钮占位. 设置对话框尚未实现, 点击不触发任何动作.
 * @returns 设置按钮元素.
 */
export function SettingsTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Button variant="ghost" className="w-full justify-start">
      <SettingsIcon aria-hidden="true" data-icon="inline-start" />
      {t("settings.open")}
    </Button>
  );
}
