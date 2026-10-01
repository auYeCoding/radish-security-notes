import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { PasswordField } from "@renderer/components/password-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";
import { Field, FieldGroup } from "@renderer/components/ui/field";

/**
 * 解锁表单的取值.
 */
interface UnlockFormValues {
  /**
   * 用户输入的主密码.
   */
  password: string;
}

/**
 * 解锁表单的属性.
 */
interface UnlockFormProps {
  /**
   * 提交主密码时的回调.
   */
  readonly onSubmit: (masterPassword: string) => void;
  /**
   * 解锁操作是否正在执行, 执行中禁用按钮并显示处理中的文案.
   */
  readonly isPending: boolean;
  /**
   * 主密码字段的错误文字, 例如主密码不正确, 显示在输入框下方.
   */
  readonly fieldError?: string;
  /**
   * 与字段无关的错误文字, 显示在表单顶部的提示条里.
   */
  readonly alertMessage?: string;
}

/**
 * 解锁表单: 一个主密码输入框和解锁按钮. 页面出现时输入框自动获得焦点.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function UnlockForm(props: UnlockFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { register, handleSubmit, setFocus } = useForm<UnlockFormValues>({
    defaultValues: { password: "" },
  });
  useEffect(() => {
    setFocus("password");
  }, [setFocus]);
  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => props.onSubmit(values.password))(event)
      }
    >
      <FieldGroup>
        {props.alertMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{props.alertMessage}</AlertDescription>
          </Alert>
        )}
        <PasswordField
          {...register("password")}
          label={t("vault.unlock.passwordLabel")}
          autoComplete="current-password"
          error={props.fieldError}
        />
        <Field>
          <Button type="submit" disabled={props.isPending}>
            {props.isPending
              ? t("vault.unlock.submitting")
              : t("vault.unlock.submit")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
