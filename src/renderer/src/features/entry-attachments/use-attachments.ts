import { useCallback } from "react";

import { useAttachmentBridge } from "@renderer/stores/use-attachment-bridge";

import { useAttachmentList, type AttachmentList } from "./use-attachment-list";
import { useAttachmentOperations } from "./use-attachment-operations";

/**
 * 一个条目附件区的状态与操作.
 */
export interface AttachmentsController extends AttachmentList {
  /**
   * 添加是否正在进行, 进行中不接受新的添加.
   */
  readonly isAdding: boolean;
  /**
   * 最近一次操作失败的文案, 没有失败或下一次操作开始后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 弹出选择文件对话框并添加所选文件, 取消时什么都不做.
   * @returns 添加结束后兑现.
   */
  readonly addFromDialog: () => Promise<void>;
  /**
   * 添加拖入的文件.
   * @param files 拖入的文件.
   * @returns 添加结束后兑现.
   */
  readonly addDropped: (files: readonly File[]) => Promise<void>;
  /**
   * 把附件另存为用户选的文件.
   * @param attachmentId 附件编号.
   * @returns 操作结束后兑现.
   */
  readonly saveAs: (attachmentId: string) => Promise<void>;
  /**
   * 用系统默认程序打开附件.
   * @param attachmentId 附件编号.
   * @returns 操作结束后兑现.
   */
  readonly open: (attachmentId: string) => Promise<void>;
  /**
   * 删除附件, 成功时同时从列表里移走.
   * @param attachmentId 附件编号.
   * @returns 删除成功时为 undefined, 失败时为失败文案.
   */
  readonly remove: (attachmentId: string) => Promise<string | undefined>;
  /**
   * 关闭失败提示.
   */
  readonly dismissFailure: () => void;
}

/**
 * 跟踪一个条目的附件区: 读取附件列表, 添加 (对话框与拖入), 另存为, 打开与删除, 并把失败翻译成
 * 提示文案. 每次新操作开始时清除上一条失败提示.
 * @param entryId 条目编号.
 * @returns 附件区的状态与操作.
 */
export function useAttachments(entryId: string): AttachmentsController {
  const bridge = useAttachmentBridge();
  const list = useAttachmentList(entryId);
  const { removeById } = list;
  const operations = useAttachmentOperations(list.append);
  const { describe, runAdd, runAction } = operations;
  const remove = useCallback(
    async (attachmentId: string): Promise<string | undefined> => {
      const result = await bridge.remove(attachmentId);
      if (result.ok) {
        removeById(attachmentId);
        return undefined;
      }
      return describe(result);
    },
    [bridge, removeById, describe],
  );
  return {
    ...list,
    isAdding: operations.isAdding,
    failureMessage: operations.failureMessage,
    dismissFailure: operations.dismissFailure,
    addFromDialog: () => runAdd(() => bridge.addFromDialog(entryId)),
    addDropped: (files) => runAdd(() => bridge.addDropped(entryId, files)),
    saveAs: (attachmentId) => runAction(() => bridge.saveAs(attachmentId)),
    open: (attachmentId) => runAction(() => bridge.open(attachmentId)),
    remove,
  };
}
