import { useTranslation } from "react-i18next";

import { TotpInputField } from "@renderer/components/entry-form/totp-input-field";
import { useTotpFormImport } from "@renderer/stores/use-totp-form-import";

/**
 * 新建表单里的 TOTP 区: 一个默认遮罩的输入框, 接受 Base32 密钥或 otpauth 链接, 可粘贴或选择
 * 二维码图片. 必须在 `FormProvider` 里使用.
 * @returns TOTP 区元素.
 */
export function NewEntryTotpField(): React.JSX.Element {
  const { t } = useTranslation();
  const { status, importImage } = useTotpFormImport();
  return (
    <TotpInputField
      description={t("entryForm.totp.description")}
      imageStatus={status}
      onImage={(image) => void importImage(image)}
    />
  );
}
