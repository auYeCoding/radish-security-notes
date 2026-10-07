import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { CheckboxField } from "@renderer/components/checkbox-field";
import { FieldError } from "@renderer/components/ui/field";

import {
  describeDisableFieldError,
  type DisableMasterPasswordValues,
} from "./disable-master-password-schema";

/**
 * 确认勾选字段的属性.
 */
interface DisableAcknowledgementFieldProps {
  /**
   * 表单的控制器.
   */
  readonly control: Control<DisableMasterPasswordValues>;
  /**
   * 勾选项的校验错误代码, 没有错误时为 undefined.
   */
  readonly errorCode: string | undefined;
}

/**
 * "我了解关闭后的保护强度" 确认勾选: 勾选框与未勾选时的错误.
 * @param props 组件属性.
 * @returns 确认勾选字段元素.
 */
export function DisableAcknowledgementField(
  props: DisableAcknowledgementFieldProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <Controller
        control={props.control}
        name="acknowledged"
        render={({ field }) => (
          <CheckboxField
            label={t(
              "settings.security.masterPassword.disable.acknowledgeLabel",
            )}
            isChecked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <FieldError>{describeDisableFieldError(props.errorCode, t)}</FieldError>
    </>
  );
}
