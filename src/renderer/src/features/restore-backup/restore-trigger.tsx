import { ArchiveRestoreIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { RestoreDialog } from "./restore-dialog";

/**
 * 恢复入口: 侧栏底部邮箱备份按钮下方的按钮, 图标加文字; 点击打开恢复对话框. 对话框只在打开时挂载,
 * 关闭后流程状态随之丢弃.
 * @returns 入口按钮与对话框元素.
 */
export function RestoreTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <ArchiveRestoreIcon aria-hidden="true" data-icon="inline-start" />
        {t("restore.trigger.label")}
      </Button>
      {isOpen && <RestoreDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
