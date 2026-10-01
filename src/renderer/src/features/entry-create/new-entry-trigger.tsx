import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

import { NewEntryDialog } from "./new-entry-dialog";

/**
 * 新建条目的入口: 加号图标按钮, 名称放在无障碍标签与悬停提示里; 点击打开新建对话框.
 * @returns 入口按钮与对话框元素.
 */
export function NewEntryTrigger(): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("entryCreate.open")}
              onClick={() => setIsOpen(true)}
            />
          }
        >
          <PlusIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("entryCreate.open")}</TooltipContent>
      </Tooltip>
      <NewEntryDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
