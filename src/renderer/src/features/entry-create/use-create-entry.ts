import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { describeCreateFailure } from "./describe-create-failure";

/**
 * 新建条目的提交状态与方法.
 */
export interface CreateEntry {
  /**
   * 最近一次保存失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 提交表单取值: 带上所选类型经条目 store 新建条目, 成功时调用成功回调, 失败时记下失败
   * 文案.
   * @param values 表单取值.
   * @returns 提交完成后兑现.
   */
  readonly submit: (values: NewEntryFormValues) => Promise<void>;
}

/**
 * 跟踪新建条目的提交结果.
 * @param typeKey 用户选的条目类型键, 预设类型键或自定义类型键.
 * @param onCreated 新建成功后的回调, 例如关闭对话框.
 * @returns 失败文案与提交方法.
 */
export function useCreateEntry(
  typeKey: string,
  onCreated: () => void,
): CreateEntry {
  const { t } = useTranslation();
  const create = useEntryStore((state) => state.create);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const submit = useCallback(
    async (values: NewEntryFormValues): Promise<void> => {
      setFailureMessage(undefined);
      const result = await create({ type: typeKey, ...values });
      if (result.ok) {
        onCreated();
        return;
      }
      setFailureMessage(describeCreateFailure(result.reason, t));
    },
    [create, typeKey, onCreated, t],
  );
  return { failureMessage, submit };
}
