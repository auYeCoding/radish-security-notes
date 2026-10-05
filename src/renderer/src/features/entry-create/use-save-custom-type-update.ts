import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";

import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useEntryTypeStore } from "@renderer/stores/use-entry-type-store";

import { describeCustomTypeFailure } from "./custom-type-errors";

/**
 * 保存一次修改的三种结果回调.
 */
export interface SaveCustomTypeUpdateHandlers {
  /**
   * 修改已保存, 条目一侧也已跟上.
   */
  readonly onUpdated: () => void;
  /**
   * 主进程要求先确认影响, 参数是被拒绝的取值.
   */
  readonly onConfirmationRequired: (values: CustomEntryTypeFormValues) => void;
  /**
   * 保存失败, 参数是失败文案.
   */
  readonly onFailed: (message: string) => void;
}

/**
 * 保存对一个自定义类型的修改: 经类型 store 提交, 成功后让条目一侧跟上 (重读列表, 详情与搜索),
 * 再按结果调用对应的回调.
 * @param typeId 要修改的类型的唯一编号.
 * @param handlers 三种结果的回调.
 * @returns 带确认标记保存取值的方法.
 */
export function useSaveCustomTypeUpdate(
  typeId: string,
  handlers: SaveCustomTypeUpdateHandlers,
): (
  values: CustomEntryTypeFormValues,
  isImpactConfirmed: boolean,
) => Promise<void> {
  const { t } = useTranslation();
  const update = useEntryTypeStore((state) => state.update);
  const reloadEntries = useEntryStore((state) => state.reloadAfterTypeChange);
  const { onUpdated, onConfirmationRequired, onFailed } = handlers;
  return useCallback(
    async (values, isImpactConfirmed): Promise<void> => {
      const result = await update({
        id: typeId,
        name: values.name,
        fields: values.fields,
        isImpactConfirmed,
      });
      if (result.ok) {
        await reloadEntries();
        onUpdated();
        return;
      }
      if (result.reason === "confirmation-required" && !isImpactConfirmed) {
        onConfirmationRequired(values);
        return;
      }
      onFailed(describeCustomTypeFailure(result.reason, t));
    },
    [
      update,
      reloadEntries,
      typeId,
      onUpdated,
      onConfirmationRequired,
      onFailed,
      t,
    ],
  );
}
