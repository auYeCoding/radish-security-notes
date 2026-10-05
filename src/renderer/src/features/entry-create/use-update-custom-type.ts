import { useCallback, useState } from "react";

import {
  isUpdateConfirmationNeeded,
  measureUpdateImpact,
  type CustomEntryTypeUpdateImpact,
} from "@shared/entries/custom-types/custom-entry-type-impact";
import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

import { useEntryCountOfType } from "@renderer/stores/use-entry-count-of-type";

import { useSaveCustomTypeUpdate } from "./use-save-custom-type-update";

/**
 * 等待用户确认的一次修改: 它对已有字段的影响与类型下已有的条目个数.
 */
export interface PendingTypeUpdate {
  /**
   * 这次修改对已有字段的影响.
   */
  readonly impact: CustomEntryTypeUpdateImpact;
  /**
   * 类型下已有的条目个数.
   */
  readonly entryCount: number;
}

/**
 * 修改自定义类型的提交状态与方法.
 */
export interface UpdateCustomType {
  /**
   * 最近一次保存失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 正在等用户确认的修改, 没有需要确认的修改时为 undefined.
   */
  readonly pendingImpact: PendingTypeUpdate | undefined;
  /**
   * 带确认标记的保存是否正在执行.
   */
  readonly isConfirming: boolean;
  /**
   * 提交表单取值: 会丢失条目取值或把保密字段改成非保密时先转入待确认, 其余直接保存.
   * @param values 表单取值.
   * @returns 提交完成后兑现.
   */
  readonly submit: (values: CustomEntryTypeFormValues) => Promise<void>;
  /**
   * 用户确认后带确认标记保存待确认的修改.
   * @returns 保存完成后兑现.
   */
  readonly confirm: () => Promise<void>;
  /**
   * 用户放弃确认, 回到表单继续修改.
   */
  readonly dismiss: () => void;
}

/**
 * 由待确认的取值生成等待用户确认的修改.
 * @param type 修改前已保存的类型.
 * @param values 待确认的表单取值, 没有待确认的修改时为 undefined.
 * @param entryCount 类型下已有的条目个数.
 * @returns 等待确认的修改, 没有待确认的修改时为 undefined.
 */
function pendingUpdateOf(
  type: CustomEntryType,
  values: CustomEntryTypeFormValues | undefined,
  entryCount: number,
): PendingTypeUpdate | undefined {
  return values === undefined
    ? undefined
    : { impact: measureUpdateImpact(type, values.fields), entryCount };
}

/**
 * 跟踪修改自定义类型的提交结果. 界面预判到会丢失取值或降低保护时先转入待确认, 主进程仍要求确认
 * 时 (界面预判不到的情况) 同样转入待确认.
 * @param type 修改前已保存的类型.
 * @param onUpdated 修改成功后的回调.
 * @returns 失败文案, 待确认的修改与提交方法.
 */
export function useUpdateCustomType(
  type: CustomEntryType,
  onUpdated: () => void,
): UpdateCustomType {
  const entryCount = useEntryCountOfType(type.key);
  const [failureMessage, setFailureMessage] = useState<string | undefined>();
  const [pendingValues, setPendingValues] = useState<
    CustomEntryTypeFormValues | undefined
  >();
  const [isConfirming, setIsConfirming] = useState(false);
  const handleFailed = useCallback((message: string): void => {
    setPendingValues(undefined);
    setFailureMessage(message);
  }, []);
  const save = useSaveCustomTypeUpdate(type.id, {
    onUpdated,
    onConfirmationRequired: setPendingValues,
    onFailed: handleFailed,
  });
  const submit = useCallback(
    async (values: CustomEntryTypeFormValues): Promise<void> => {
      setFailureMessage(undefined);
      const impact = measureUpdateImpact(type, values.fields);
      if (isUpdateConfirmationNeeded(impact, entryCount)) {
        setPendingValues(values);
        return;
      }
      await save(values, false);
    },
    [type, entryCount, save],
  );
  const confirm = useCallback(async (): Promise<void> => {
    if (pendingValues === undefined) {
      return;
    }
    setIsConfirming(true);
    await save(pendingValues, true);
    setIsConfirming(false);
  }, [pendingValues, save]);
  return {
    failureMessage,
    pendingImpact: pendingUpdateOf(type, pendingValues, entryCount),
    isConfirming,
    submit,
    confirm,
    dismiss: () => setPendingValues(undefined),
  };
}
