import { Button } from "@renderer/components/ui/button";
import { DialogClose, DialogFooter } from "@renderer/components/ui/dialog";

/**
 * 条目表单操作区的属性.
 */
interface EntryFormActionsProps {
  /**
   * 取消按钮的文字.
   */
  readonly cancelLabel: string;
  /**
   * 保存按钮的文字.
   */
  readonly submitLabel: string;
  /**
   * 保存执行中保存按钮的文字.
   */
  readonly submittingLabel: string;
  /**
   * 保存是否正在执行, 执行中禁用按钮并显示处理中的文案.
   */
  readonly isSubmitting: boolean;
}

/**
 * 条目表单所在对话框的底部操作区, 新建与编辑共用: 取消与保存按钮. 取消经对话框的关闭通道,
 * 由对话框决定是否直接关闭.
 * @param props 组件属性.
 * @returns 操作区元素.
 */
export function EntryFormActions(
  props: EntryFormActionsProps,
): React.JSX.Element {
  return (
    <DialogFooter>
      <DialogClose
        render={
          <Button
            type="button"
            variant="outline"
            disabled={props.isSubmitting}
          />
        }
      >
        {props.cancelLabel}
      </DialogClose>
      <Button type="submit" disabled={props.isSubmitting}>
        {props.isSubmitting ? props.submittingLabel : props.submitLabel}
      </Button>
    </DialogFooter>
  );
}
