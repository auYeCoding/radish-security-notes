import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { NewTagDialog } from "./new-tag-dialog";

/**
 * 新建标签的入口: 图标加文字的按钮, 放在设置的 "标签" 分区里; 点击打开新建对话框. 对话框只在打开时
 * 挂载, 关闭后表单状态随之丢弃.
 * @returns 入口按钮与对话框元素.
 */
export function NewTagTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <PlusIcon aria-hidden="true" data-icon="inline-start" />
        {t("tagCreate.open")}
      </Button>
      {isOpen && <NewTagDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
