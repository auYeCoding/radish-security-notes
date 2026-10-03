import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EditEntryFormValues } from "@shared/entries/edit-entry-schema";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { describeEditFailure } from "./describe-edit-failure";
import { toUpdateEntryInput } from "./edit-entry-values";

/**
 * 编辑条目的提交状态与方法.
 */
export interface EditEntry {
  /**
   * 最近一次保存失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 提交表单取值: 经条目 store 更新条目, 成功时调用成功回调, 失败时记下失败文案.
   * @param values 表单取值.
   * @returns 提交完成后兑现.
   */
  readonly submit: (values: EditEntryFormValues) => Promise<void>;
}

/**
 * 跟踪编辑条目的提交结果.
 * @param entryId 要编辑的条目编号.
 * @param onSaved 保存成功后的回调, 例如关闭对话框.
 * @returns 失败文案与提交方法.
 */
export function useEditEntry(entryId: string, onSaved: () => void): EditEntry {
  const { t } = useTranslation();
  const update = useEntryStore((state) => state.update);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const submit = useCallback(
    async (values: EditEntryFormValues): Promise<void> => {
      setFailureMessage(undefined);
      const result = await update(entryId, toUpdateEntryInput(values));
      if (result.ok) {
        onSaved();
        return;
      }
      setFailureMessage(describeEditFailure(result.reason, t));
    },
    [update, entryId, onSaved, t],
  );
  return { failureMessage, submit };
}
