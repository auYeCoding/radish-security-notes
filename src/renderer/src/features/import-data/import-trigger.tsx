import { FileInputIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { ImportDialog } from "./import-dialog";

/**
 * 导入入口: 侧栏底部的按钮, 图标加文字; 点击打开导入对话框. 对话框只在打开时挂载, 关闭后流程状态
 * 随之丢弃.
 * @returns 入口按钮与对话框元素.
 */
export function ImportTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <FileInputIcon aria-hidden="true" data-icon="inline-start" />
        {t("import.trigger.label")}
      </Button>
      {isOpen && <ImportDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
