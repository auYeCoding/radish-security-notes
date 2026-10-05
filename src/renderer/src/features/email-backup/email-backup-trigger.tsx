import { MailIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { EmailBackupDialog } from "./email-backup-dialog";

/**
 * 邮箱备份入口: 侧栏底部导出按钮下方的按钮, 图标加文字; 点击打开邮箱备份对话框. 对话框只在打开
 * 时挂载, 关闭后流程状态随之丢弃.
 * @returns 入口按钮与对话框元素.
 */
export function EmailBackupTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <MailIcon aria-hidden="true" data-icon="inline-start" />
        {t("emailBackup.trigger.label")}
      </Button>
      {isOpen && <EmailBackupDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
