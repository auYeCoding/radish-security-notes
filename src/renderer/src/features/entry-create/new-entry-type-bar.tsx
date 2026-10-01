import { ArrowLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

import { EntryTypeIcon } from "@renderer/components/entry-type-icon";
import { Button } from "@renderer/components/ui/button";

/**
 * 类型栏的属性.
 */
interface NewEntryTypeBarProps {
  /**
   * 已选中的条目类型.
   */
  readonly type: PresetEntryTypeDefinition;
  /**
   * 点击返回按钮时的回调, 回到类型选择.
   */
  readonly onBack: () => void;
  /**
   * 是否禁用返回按钮, 保存进行中时禁用.
   */
  readonly isDisabled: boolean;
}

/**
 * 新建表单顶部的类型栏: 左侧是返回类型选择的按钮, 右侧是已选类型的图标与名称.
 * @param props 组件属性.
 * @returns 类型栏元素.
 */
export function NewEntryTypeBar(
  props: NewEntryTypeBarProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={props.isDisabled}
        onClick={props.onBack}
      >
        <ArrowLeftIcon aria-hidden="true" />
        {t("entryCreate.typeStep.back")}
      </Button>
      <p className="flex items-center gap-2 text-sm font-medium">
        <EntryTypeIcon typeKey={props.type.key} className="size-4" />
        {t(`entryTypes.${props.type.key}`)}
      </p>
    </div>
  );
}
