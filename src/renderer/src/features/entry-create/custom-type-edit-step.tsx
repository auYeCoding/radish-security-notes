import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { useEntryTypeStore } from "@renderer/stores/use-entry-type-store";

import { CustomTypeBackBar } from "./custom-type-back-bar";
import { CustomTypeEditForm } from "./custom-type-edit-form";

/**
 * 编辑类型步骤的属性.
 */
interface CustomTypeEditStepProps {
  /**
   * 要编辑的自定义类型的唯一编号.
   */
  readonly typeId: string;
  /**
   * 点击返回按钮时的回调, 回到类型选择.
   */
  readonly onBack: () => void;
  /**
   * 修改成功后的回调.
   */
  readonly onUpdated: () => void;
}

/**
 * 新建条目对话框里编辑自定义类型的一步: 按编号从类型 store 取出类型, 显示编辑表单; 类型已不存在时
 * (例如被删除) 只显示返回按钮与提示.
 * @param props 组件属性.
 * @returns 编辑表单, 或类型不存在的提示元素.
 */
export function CustomTypeEditStep(
  props: CustomTypeEditStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const type = useEntryTypeStore((state) =>
    state.customTypes.find((candidate) => candidate.id === props.typeId),
  );
  if (type === undefined) {
    return (
      <div className="flex flex-col gap-5">
        <CustomTypeBackBar onBack={props.onBack} isDisabled={false} />
        <Alert variant="destructive">
          <AlertDescription>
            {t("entryCreate.customType.error.notFound")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return (
    <CustomTypeEditForm
      type={type}
      onBack={props.onBack}
      onUpdated={props.onUpdated}
    />
  );
}
