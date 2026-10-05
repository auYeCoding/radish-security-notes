import { TriangleAlertIcon } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@renderer/components/ui/alert";

/**
 * 警示提示条的属性.
 */
interface ImportWarningAlertProps {
  /**
   * 提示的标题.
   */
  readonly title: string;
  /**
   * 提示的说明.
   */
  readonly description: string;
}

/**
 * 导入对话框里的警示提示条: 警示图标, 标题与说明. 选择来源时的明文风险提示与导入结束后的删除
 * 导出文件提示共用.
 * @param props 组件属性.
 * @returns 提示条元素.
 */
export function ImportWarningAlert(
  props: ImportWarningAlertProps,
): React.JSX.Element {
  return (
    <Alert>
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>{props.title}</AlertTitle>
      <AlertDescription>{props.description}</AlertDescription>
    </Alert>
  );
}
