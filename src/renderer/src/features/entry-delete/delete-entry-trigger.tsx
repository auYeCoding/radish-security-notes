import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { EntryDetail } from "@shared/entries/entry-types";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

import { DeleteEntryDialog } from "./delete-entry-dialog";

/**
 * 删除入口的属性.
 */
interface DeleteEntryTriggerProps {
  /**
   * 要删除的条目详情.
   */
  readonly detail: EntryDetail;
}

/**
 * 删除条目的入口: 垃圾桶图标按钮, 名称放在无障碍标签与悬停提示里; 点击打开删除确认框.
 * @param props 组件属性.
 * @returns 入口按钮与确认框元素.
 */
export function DeleteEntryTrigger(
  props: DeleteEntryTriggerProps,
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
              aria-label={t("entryDelete.open")}
              onClick={() => setIsOpen(true)}
            />
          }
        >
          <Trash2Icon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("entryDelete.open")}</TooltipContent>
      </Tooltip>
      {isOpen && (
        <DeleteEntryDialog
          detail={props.detail}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
