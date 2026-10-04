import { PaperclipIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

/**
 * 附件区标题行的属性.
 */
interface AttachmentSectionHeaderProps {
  /**
   * 已有的附件个数.
   */
  readonly count: number;
  /**
   * 添加是否正在进行, 进行中添加按钮禁用并显示进行中的文案.
   */
  readonly isAdding: boolean;
  /**
   * 点添加按钮时的回调.
   */
  readonly onAdd: () => void;
}

/**
 * 附件区的标题行: 左侧是带个数的标题, 右侧是添加附件按钮.
 * @param props 组件属性.
 * @returns 标题行元素.
 */
export function AttachmentSectionHeader(
  props: AttachmentSectionHeaderProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-medium">
        {t("entryAttachments.heading", { count: props.count })}
      </h3>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={props.isAdding}
        onClick={props.onAdd}
      >
        <PaperclipIcon aria-hidden="true" />
        {props.isAdding
          ? t("entryAttachments.adding")
          : t("entryAttachments.add")}
      </Button>
    </div>
  );
}
