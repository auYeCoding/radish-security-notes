import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

import { CustomTypeFormView } from "./custom-type-form-view";
import { createEditCustomTypeValues } from "./custom-type-edit-defaults";
import { CustomTypeImpactDialog } from "./custom-type-impact-dialog";
import { useUpdateCustomType } from "./use-update-custom-type";

/**
 * 编辑类型表单的属性.
 */
interface CustomTypeEditFormProps {
  /**
   * 要编辑的已保存类型.
   */
  readonly type: CustomEntryType;
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
 * 编辑自定义条目类型的表单: 表单外壳加类型已有的取值与保存修改的提交行为. 会丢失条目取值或把保密
 * 字段改成非保密时, 保存前先弹出写明影响的确认框, 确认后才保存; 保存失败的原因显示在字段区上方的
 * 提示条里.
 * @param props 组件属性.
 * @returns 表单与确认框元素.
 */
export function CustomTypeEditForm(
  props: CustomTypeEditFormProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const {
    failureMessage,
    pendingImpact,
    isConfirming,
    submit,
    confirm,
    dismiss,
  } = useUpdateCustomType(props.type, props.onUpdated);
  const defaultValues = useMemo(
    () => createEditCustomTypeValues(props.type),
    [props.type],
  );
  return (
    <>
      <CustomTypeFormView
        defaultValues={defaultValues}
        failureMessage={failureMessage}
        submitLabel={t("entryCreate.customType.edit.submit")}
        submittingLabel={t("entryCreate.customType.edit.submitting")}
        onSubmit={submit}
        onBack={props.onBack}
      />
      {pendingImpact !== undefined && (
        <CustomTypeImpactDialog
          pending={pendingImpact}
          isPending={isConfirming}
          onConfirm={() => void confirm()}
          onClose={dismiss}
        />
      )}
    </>
  );
}
