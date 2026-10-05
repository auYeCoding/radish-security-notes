import { FileOutputIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { ExportDialog } from "./export-dialog";

/**
 * 导出入口: 侧栏底部导入按钮下方的按钮, 图标加文字; 点击打开导出对话框. 对话框只在打开时挂载, 关闭后
 * 流程状态随之丢弃.
 * @returns 入口按钮与对话框元素.
 */
export function ExportTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <FileOutputIcon aria-hidden="true" data-icon="inline-start" />
        {t("export.trigger.label")}
      </Button>
      {isOpen && <ExportDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
