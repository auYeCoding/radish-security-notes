import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { createDefaultCustomTypeValues } from "./custom-type-defaults";
import { CustomTypeFormView } from "./custom-type-form-view";
import { useCreateCustomType } from "./use-create-custom-type";

/**
 * 新建类型表单的属性.
 */
interface CustomTypeFormProps {
  /**
   * 点击返回按钮时的回调, 回到类型选择.
   */
  readonly onBack: () => void;
  /**
   * 新建成功后的回调, 参数是新类型的定义.
   */
  readonly onCreated: (type: EntryTypeDefinition) => void;
}

/**
 * 新建自定义条目类型的表单: 表单外壳加新建的默认取值与提交行为, 保存失败的原因显示在字段区上方的
 * 提示条里.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function CustomTypeForm(props: CustomTypeFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { failureMessage, submit } = useCreateCustomType(props.onCreated);
  const defaultValues = useMemo(() => createDefaultCustomTypeValues(), []);
  return (
    <CustomTypeFormView
      defaultValues={defaultValues}
      failureMessage={failureMessage}
      submitLabel={t("entryCreate.customType.submit")}
      submittingLabel={t("entryCreate.customType.submitting")}
      onSubmit={submit}
      onBack={props.onBack}
    />
  );
}
