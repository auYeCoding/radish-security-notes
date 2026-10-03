import { useTranslation } from "react-i18next";

import { countEntriesWithTag } from "@shared/tags/tag-filter";
import type { TagSummary } from "@shared/tags/tag-types";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog";
import { useEntryStore } from "@renderer/stores/use-entry-store";

import { useDeleteTag } from "./use-delete-tag";

/**
 * 删除确认框的属性.
 */
interface DeleteTagDialogProps {
  /**
   * 要删除的标签.
   */
  readonly tag: TagSummary;
  /**
   * 确认框要关闭时的回调, 取消或删除成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 删除确认框内容的属性.
 */
interface DeleteTagBodyProps extends Omit<DeleteTagDialogProps, "onClose"> {
  /**
   * 删除是否正在执行.
   */
  readonly isDeleting: boolean;
  /**
   * 最近一次删除失败的文案, 没有失败时为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 点 "删除" 时的回调.
   */
  readonly onConfirm: () => void;
}

/**
 * 确认框的内容: 标题, 说明 (其中有条目带这个标签时写明条目数量与 "摘掉标签, 条目本身不删除"),
 * 失败原因, 取消与删除按钮.
 * @param props 组件属性.
 * @returns 确认框内容元素.
 */
function DeleteTagBody(props: DeleteTagBodyProps): React.JSX.Element {
  const { t } = useTranslation();
  const { tag } = props;
  const entryCount = useEntryStore((state) =>
    countEntriesWithTag(state.entries, tag.id),
  );
  const description =
    entryCount === 0
      ? t("tagDelete.descriptionEmpty", { name: tag.name })
      : t("tagDelete.descriptionWithEntries", {
          name: tag.name,
          count: entryCount,
        });
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("tagDelete.title")}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {props.failureMessage !== undefined && (
        <Alert variant="destructive">
          <AlertDescription>{props.failureMessage}</AlertDescription>
        </Alert>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={props.isDeleting}>
          {t("tagDelete.cancel")}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={props.isDeleting}
          onClick={props.onConfirm}
        >
          {props.isDeleting ? t("tagDelete.deleting") : t("tagDelete.confirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * 删除标签的确认框, 挂载即打开, 关闭即卸载: 用户点 "删除" 才执行, 点 "取消" 或按 Esc 则保留.
 * 删除进行中不响应关闭.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function DeleteTagDialog(
  props: DeleteTagDialogProps,
): React.JSX.Element {
  const { tag, onClose } = props;
  const { isDeleting, failureMessage, confirm } = useDeleteTag(tag.id, onClose);
  return (
    <AlertDialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isDeleting) {
          onClose();
        }
      }}
    >
      <DeleteTagBody
        tag={tag}
        isDeleting={isDeleting}
        failureMessage={failureMessage}
        onConfirm={() => void confirm()}
      />
    </AlertDialog>
  );
}
