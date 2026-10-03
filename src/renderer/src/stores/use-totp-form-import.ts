import { useCallback } from "react";
import { useFormContext } from "react-hook-form";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import {
  useTotpImageImport,
  type TotpImageImport,
} from "./use-totp-image-import";

/**
 * 在条目表单里读取二维码图片: 图片交给主进程解码, 读到有效的 TOTP 链接时填回表单的 TOTP 输入
 * 框并标为已修改, 立即校验. 新建与编辑条目的表单共用, 必须在 `FormProvider` 里使用.
 * @returns 读取状态与读取方法.
 */
export function useTotpFormImport(): TotpImageImport {
  const { setValue } = useFormContext<NewEntryFormValues>();
  const applyLink = useCallback(
    (link: string): void =>
      setValue("totp", link, { shouldDirty: true, shouldValidate: true }),
    [setValue],
  );
  return useTotpImageImport(applyLink);
}
