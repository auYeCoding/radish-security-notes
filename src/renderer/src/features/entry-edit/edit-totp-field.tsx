import { useId } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { EditEntryFormValues } from "@shared/entries/edit-entry-schema";

import { TotpInputField } from "@renderer/components/entry-form/totp-input-field";
import { Checkbox } from "@renderer/components/ui/checkbox";
import { Field, FieldLabel } from "@renderer/components/ui/field";
import { useTotpFormImport } from "@renderer/stores/use-totp-form-import";

/**
 * 编辑表单里的 TOTP 区的属性.
 */
interface EditTotpFieldProps {
  /**
   * 条目原来是否带 TOTP. 带时输入框留空表示保持不变, 并可勾选移除; 不带时同新建.
   */
  readonly hasTotp: boolean;
}

/**
 * 编辑表单里的 TOTP 区. 条目原来带 TOTP 时, 密钥与参数不进表单: 输入框留空表示保持不变, 填入
 * 新的密钥或链接表示替换, 勾选 "移除 TOTP" 表示移除 (勾选时清空并禁用输入框). 条目原来不带
 * TOTP 时, 只有输入框, 填入内容表示添加. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns TOTP 区元素.
 */
export function EditTotpField(props: EditTotpFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const identifier = useId();
  const { control, setValue, clearErrors } =
    useFormContext<EditEntryFormValues>();
  const { status, importImage } = useTotpFormImport();
  const isRemoving = useWatch({ control, name: "removeTotp" });
  const handleRemoveChange = (isChecked: boolean): void => {
    setValue("removeTotp", isChecked, { shouldDirty: true });
    if (isChecked) {
      setValue("totp", "", { shouldDirty: true });
      clearErrors("totp");
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <TotpInputField
        description={t(
          props.hasTotp
            ? "entryEdit.totp.keepDescription"
            : "entryForm.totp.description",
        )}
        imageStatus={status}
        onImage={(image) => void importImage(image)}
        isDisabled={isRemoving}
      />
      {props.hasTotp && (
        <Controller
          control={control}
          name="removeTotp"
          render={({ field }) => (
            <Field orientation="horizontal" className="w-auto">
              <Checkbox
                id={identifier}
                checked={field.value}
                onCheckedChange={handleRemoveChange}
              />
              <FieldLabel htmlFor={identifier}>
                {t("entryEdit.totp.removeLabel")}
              </FieldLabel>
            </Field>
          )}
        />
      )}
    </div>
  );
}
