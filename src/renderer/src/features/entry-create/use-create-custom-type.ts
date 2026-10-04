import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { toEntryTypeDefinition } from "@shared/entries/custom-types/custom-entry-type-definition";
import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { useEntryTypeStore } from "@renderer/stores/use-entry-type-store";

import { describeCustomTypeFailure } from "./custom-type-errors";

/**
 * 新建自定义类型的提交状态与方法.
 */
export interface CreateCustomType {
  /**
   * 最近一次保存失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 提交表单取值: 经自定义类型 store 新建类型, 成功时带着新类型的定义调用成功回调, 失败时记下
   * 失败文案.
   * @param values 表单取值.
   * @returns 提交完成后兑现.
   */
  readonly submit: (values: CustomEntryTypeFormValues) => Promise<void>;
}

/**
 * 跟踪新建自定义类型的提交结果.
 * @param onCreated 新建成功后的回调, 参数是新类型的定义.
 * @returns 失败文案与提交方法.
 */
export function useCreateCustomType(
  onCreated: (type: EntryTypeDefinition) => void,
): CreateCustomType {
  const { t } = useTranslation();
  const create = useEntryTypeStore((state) => state.create);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const submit = useCallback(
    async (values: CustomEntryTypeFormValues): Promise<void> => {
      setFailureMessage(undefined);
      const result = await create(values);
      if (result.ok) {
        onCreated(toEntryTypeDefinition(result.value));
        return;
      }
      setFailureMessage(describeCustomTypeFailure(result.reason, t));
    },
    [create, onCreated, t],
  );
  return { failureMessage, submit };
}
