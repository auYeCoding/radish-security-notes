import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  newEntrySchema,
  type NewEntryFormValues,
} from "@shared/entries/new-entry-schema";

import { PasswordField } from "@renderer/components/password-field";
import { TextField } from "@renderer/components/text-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";

import { NewEntryActions } from "./new-entry-actions";
import { describeNewEntryError } from "./new-entry-errors";
import { useCreateEntry } from "./use-create-entry";

/**
 * 新建表单的属性.
 */
interface NewEntryFormProps {
  /**
   * 新建成功后的回调, 例如关闭对话框.
   */
  readonly onCreated: () => void;
}

/**
 * 新建表单的默认取值: 三项都为空.
 */
const DEFAULT_VALUES: NewEntryFormValues = {
  name: "",
  account: "",
  password: "",
};

/**
 * 新建条目的表单: 名称, 账号, 密码三项与取消, 保存按钮. 校验错误显示在对应字段下方,
 * 保存失败的原因显示在顶部的提示条里.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function NewEntryForm(props: NewEntryFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { failureMessage, submit } = useCreateEntry(props.onCreated);
  const { register, handleSubmit, formState } = useForm<NewEntryFormValues>({
    resolver: zodResolver(newEntrySchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { errors, isSubmitting } = formState;
  return (
    <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
      <FieldGroup>
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <TextField
          {...register("name")}
          label={t("entryCreate.nameLabel")}
          autoComplete="off"
          error={describeNewEntryError(errors.name?.message, t)}
        />
        <TextField
          {...register("account")}
          label={t("entryCreate.accountLabel")}
          autoComplete="off"
          error={describeNewEntryError(errors.account?.message, t)}
        />
        <PasswordField
          {...register("password")}
          label={t("entryCreate.passwordLabel")}
          autoComplete="off"
          error={describeNewEntryError(errors.password?.message, t)}
        />
        <NewEntryActions isSubmitting={isSubmitting} />
      </FieldGroup>
    </form>
  );
}
