import { XIcon } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";

/**
 * 可关闭提示条的属性.
 */
interface DismissibleAlertProps {
  /**
   * 失败的文案.
   */
  readonly message: string;
  /**
   * 关闭按钮的无障碍名称.
   */
  readonly dismissLabel: string;
  /**
   * 点关闭按钮时的回调.
   */
  readonly onDismiss: () => void;
}

/**
 * 可关闭的失败提示条: 一行失败说明加右侧的关闭按钮. 提示条自带 `role="alert"`, 屏幕阅读器会
 * 立即朗读. 批量操作与附件区的失败提示共用.
 * @param props 组件属性.
 * @returns 提示条元素.
 */
export function DismissibleAlert(
  props: DismissibleAlertProps,
): React.JSX.Element {
  return (
    <Alert variant="destructive">
      <AlertDescription>{props.message}</AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={props.dismissLabel}
          onClick={props.onDismiss}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
