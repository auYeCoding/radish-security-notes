import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import { MAX_QR_IMAGE_BYTES } from "@shared/entries/totp-config";
import type { TotpImageImportStatus } from "@shared/entries/totp-image-import-status";

import { ImagePickButton } from "@renderer/components/image-pick-button";
import { PasswordField } from "@renderer/components/password-field";

import { describeEntryFormError } from "./entry-form-errors";

/**
 * 一兆字节的字节数, 用来把图片大小上限换算成提示里的兆字节数.
 */
const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * TOTP 输入区的属性.
 */
interface TotpInputFieldProps {
  /**
   * 输入框下方的说明文字.
   */
  readonly description: string;
  /**
   * 最近一次读取二维码图片的结果, 还没有读取过时为 undefined.
   */
  readonly imageStatus: TotpImageImportStatus | undefined;
  /**
   * 粘贴或选中一张二维码图片后的回调, 由调用方读取图片里的链接并填回输入框.
   */
  readonly onImage: (image: Blob) => void;
  /**
   * 是否禁用输入框与选图按钮, 例如编辑时已勾选移除 TOTP.
   */
  readonly isDisabled?: boolean;
}

/**
 * 从剪贴板数据里找出粘贴的图片, 例如截图.
 * @param data 粘贴事件的剪贴板数据.
 * @returns 第一张图片文件, 没有图片时为 undefined.
 */
function findPastedImage(data: DataTransfer): File | undefined {
  return Array.from(data.files).find((file) => file.type.startsWith("image/"));
}

/**
 * 条目表单里的 TOTP 区, 新建与编辑共用: 一个默认遮罩的输入框, 接受 Base32 密钥或 otpauth 链接,
 * 在输入框里粘贴二维码截图, 或点击按钮选择二维码图片, 都会把图片交给调用方的回调; 输入框下方
 * 显示读取状态, 不合法的输入显示错误. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns TOTP 区元素.
 */
export function TotpInputField(props: TotpInputFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<NewEntryFormValues>();
  const label = t("entryForm.totp.label");
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>): void => {
    const image = findPastedImage(event.clipboardData);
    if (image !== undefined) {
      event.preventDefault();
      props.onImage(image);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <PasswordField
        {...register("totp")}
        label={label}
        description={props.description}
        autoComplete="off"
        disabled={props.isDisabled}
        error={describeEntryFormError(formState.errors.totp?.message, t)}
        showLabel={t("entryDetail.showField", { label })}
        hideLabel={t("entryDetail.hideField", { label })}
        onPaste={handlePaste}
      />
      <div className="flex items-center gap-3">
        <ImagePickButton
          label={t("entryForm.totp.pickImage")}
          onPick={props.onImage}
          isDisabled={
            props.isDisabled === true || props.imageStatus === "reading"
          }
        />
        <p role="status" className="text-xs text-muted-foreground">
          {props.imageStatus === undefined
            ? ""
            : t(`entryForm.totp.status.${props.imageStatus}`, {
                maxSize: MAX_QR_IMAGE_BYTES / BYTES_PER_MEGABYTE,
              })}
        </p>
      </div>
    </div>
  );
}
