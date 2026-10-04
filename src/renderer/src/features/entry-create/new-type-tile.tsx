import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

/**
 * "新建类型" 格的属性.
 */
interface NewTypeTileProps {
  /**
   * 点击格子时的回调, 进入新建类型表单.
   */
  readonly onSelect: () => void;
}

/**
 * 类型选择网格末尾的 "新建类型" 格: 虚线描边, 加号在上, 文字在下, 与类型格同尺寸, 点击进入新建
 * 自定义类型的表单.
 * @param props 组件属性.
 * @returns 新建类型格元素.
 */
export function NewTypeTile(props: NewTypeTileProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto flex-col gap-2 border-dashed px-2 py-4"
      onClick={props.onSelect}
    >
      <PlusIcon aria-hidden="true" className="size-6" />
      <span className="text-center text-sm break-words whitespace-normal">
        {t("entryCreate.typeStep.newType")}
      </span>
    </Button>
  );
}
