import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import { MAX_QR_IMAGE_BYTES } from "@shared/entries/totp-config";

import { ImagePickButton } from "@renderer/components/image-pick-button";
import { PasswordField } from "@renderer/components/password-field";

import { describeNewEntryError } from "./new-entry-errors";
import { useTotpImageImport } from "./use-totp-image-import";

/**
 * 一兆字节的字节数, 用来把图片大小上限换算成提示里的兆字节数.
 */
const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * 从剪贴板数据里找出粘贴的图片, 例如截图.
 * @param data 粘贴事件的剪贴板数据.
 * @returns 第一张图片文件, 没有图片时为 undefined.
 */
function findPastedImage(data: DataTransfer): File | undefined {
  return Array.from(data.files).find((file) => file.type.startsWith("image/"));
}

/**
 * 新建表单里的 TOTP 区: 一个默认遮罩的输入框, 接受 Base32 密钥或 otpauth 链接, 在输入框里粘贴
 * 二维码截图, 或点击按钮选择二维码图片, 都会把图片里的链接填回输入框; 输入框下方显示读取状态,
 * 不合法的输入显示错误. 必须在 `FormProvider` 里使用.
 * @returns TOTP 区元素.
 */
export function TotpInputField(): React.JSX.Element {
  const { t } = useTranslation();
  const { register, setValue, formState } =
    useFormContext<NewEntryFormValues>();
  const applyLink = useCallback(
    (link: string): void =>
      setValue("totp", link, { shouldDirty: true, shouldValidate: true }),
    [setValue],
  );
  const { status, importImage } = useTotpImageImport(applyLink);
  const label = t("entryCreate.totp.label");
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>): void => {
    const image = findPastedImage(event.clipboardData);
    if (image !== undefined) {
      event.preventDefault();
      void importImage(image);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <PasswordField
        {...register("totp")}
        label={label}
        description={t("entryCreate.totp.description")}
        autoComplete="off"
        error={describeNewEntryError(formState.errors.totp?.message, t)}
        showLabel={t("entryDetail.showField", { label })}
        hideLabel={t("entryDetail.hideField", { label })}
        onPaste={handlePaste}
      />
      <div className="flex items-center gap-3">
        <ImagePickButton
          label={t("entryCreate.totp.pickImage")}
          onPick={(image) => void importImage(image)}
          isDisabled={status === "reading"}
        />
        <p role="status" className="text-xs text-muted-foreground">
          {status === undefined
            ? ""
            : t(`entryCreate.totp.status.${status}`, {
                maxSize: MAX_QR_IMAGE_BYTES / BYTES_PER_MEGABYTE,
              })}
        </p>
      </div>
    </div>
  );
}
