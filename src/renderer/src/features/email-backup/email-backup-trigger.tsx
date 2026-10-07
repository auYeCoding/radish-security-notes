import { MailIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { AutoBackupFailureBadge } from "./auto-backup-failure-badge";
import { EmailBackupDialog } from "./email-backup-dialog";
import { useAutoBackupFailure } from "./use-auto-backup-failure";

/**
 * 邮箱备份入口: 侧栏底部导出按钮下方的按钮, 图标加文字; 最近一次自动备份失败时按钮右侧有失败
 * 标记. 点击打开邮箱备份对话框. 对话框只在打开时挂载, 关闭后流程状态随之丢弃.
 * @returns 入口按钮与对话框元素.
 */
export function EmailBackupTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const failureReason = useAutoBackupFailure(isOpen);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <MailIcon aria-hidden="true" data-icon="inline-start" />
        {t("emailBackup.trigger.label")}
        {failureReason !== undefined && <AutoBackupFailureBadge />}
      </Button>
      {isOpen && <EmailBackupDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
