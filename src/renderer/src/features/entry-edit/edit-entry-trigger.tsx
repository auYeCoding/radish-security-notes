import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { EntryDetail } from "@shared/entries/entry-types";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

import { EditEntryDialog } from "./edit-entry-dialog";

/**
 * 编辑入口的属性.
 */
interface EditEntryTriggerProps {
  /**
   * 要编辑的条目详情.
   */
  readonly detail: EntryDetail;
}

/**
 * 编辑条目的入口: 铅笔图标按钮, 名称放在无障碍标签与悬停提示里; 点击打开编辑对话框.
 * @param props 组件属性.
 * @returns 入口按钮与对话框元素.
 */
export function EditEntryTrigger(
  props: EditEntryTriggerProps,
): React.JSX.Element {
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
              aria-label={t("entryEdit.open")}
              onClick={() => setIsOpen(true)}
            />
          }
        >
          <PencilIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("entryEdit.open")}</TooltipContent>
      </Tooltip>
      {isOpen && (
        <EditEntryDialog
          detail={props.detail}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
