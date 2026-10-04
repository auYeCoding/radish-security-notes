import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  AttachmentFailure,
  AttachmentResult,
} from "@shared/attachments/attachment-result";
import type {
  AttachmentAddOutcome,
  AttachmentMeta,
} from "@shared/attachments/attachment-types";

import { describeAttachmentFailure } from "./describe-attachment-failure";

/**
 * 附件操作的执行状态与执行方法.
 */
export interface AttachmentOperations {
  /**
   * 添加是否正在进行.
   */
  readonly isAdding: boolean;
  /**
   * 最近一次操作失败的文案, 没有失败或下一次操作开始后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 把失败结果翻译成给用户看的文案.
   * @param failure 失败结果.
   * @returns 失败文案.
   */
  readonly describe: (failure: AttachmentFailure) => string;
  /**
   * 执行一次添加: 期间标记为添加中, 成功添加时把新附件交给回调, 失败时记下失败文案.
   * @param operation 返回添加结果的操作.
   * @returns 添加结束后兑现.
   */
  readonly runAdd: (
    operation: () => Promise<AttachmentResult<AttachmentAddOutcome>>,
  ) => Promise<void>;
  /**
   * 执行一次别的附件操作 (另存为, 打开), 失败时记下失败文案.
   * @param operation 返回操作结果的操作.
   * @returns 操作结束后兑现.
   */
  readonly runAction: (
    operation: () => Promise<AttachmentResult<unknown>>,
  ) => Promise<void>;
  /**
   * 关闭失败提示.
   */
  readonly dismissFailure: () => void;
}

/**
 * 跟踪附件区的操作: 添加进行中的标记, 最近一次失败的文案, 以及把操作结果落到状态上的执行方法.
 * 每次新操作开始时清除上一条失败提示.
 * @param onAdded 成功添加附件后的回调.
 * @returns 操作的执行状态与执行方法.
 */
export function useAttachmentOperations(
  onAdded: (attachments: readonly AttachmentMeta[]) => void,
): AttachmentOperations {
  const { t, i18n } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const describe = useCallback(
    (failure: AttachmentFailure): string =>
      describeAttachmentFailure(failure, t, i18n.language),
    [t, i18n.language],
  );
  const runAdd = useCallback(
    async (
      operation: () => Promise<AttachmentResult<AttachmentAddOutcome>>,
    ): Promise<void> => {
      setFailureMessage(undefined);
      setIsAdding(true);
      const result = await operation();
      setIsAdding(false);
      if (!result.ok) {
        setFailureMessage(describe(result));
      } else if (result.value.status === "added") {
        onAdded(result.value.attachments);
      }
    },
    [onAdded, describe],
  );
  const runAction = useCallback(
    async (
      operation: () => Promise<AttachmentResult<unknown>>,
    ): Promise<void> => {
      setFailureMessage(undefined);
      const result = await operation();
      if (!result.ok) {
        setFailureMessage(describe(result));
      }
    },
    [describe],
  );
  return {
    isAdding,
    failureMessage,
    describe,
    runAdd,
    runAction,
    dismissFailure: () => setFailureMessage(undefined),
  };
}
