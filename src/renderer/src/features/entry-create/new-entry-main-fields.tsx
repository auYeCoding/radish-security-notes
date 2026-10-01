import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { PasswordField } from "@renderer/components/password-field";
import { TextField } from "@renderer/components/text-field";

import { describeNewEntryError } from "./new-entry-errors";

/**
 * 新建表单的前四项: 名称, 账号, 密码与网址. 必须在 `FormProvider` 里使用, 校验错误显示在
 * 对应字段下方.
 * @returns 四个字段的元素.
 */
export function NewEntryMainFields(): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<NewEntryFormValues>();
  const { errors } = formState;
  return (
    <>
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
      <TextField
        {...register("url")}
        label={t("entryCreate.urlLabel")}
        autoComplete="off"
        inputMode="url"
      />
    </>
  );
}
