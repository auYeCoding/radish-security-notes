import { ArrowLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

/**
 * 新建类型表单顶部返回栏的属性.
 */
interface CustomTypeBackBarProps {
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
 * 新建类型表单顶部的返回栏: 左侧是返回类型选择的按钮.
 * @param props 组件属性.
 * @returns 返回栏元素.
 */
export function CustomTypeBackBar(
  props: CustomTypeBackBarProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center">
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
    </div>
  );
}
