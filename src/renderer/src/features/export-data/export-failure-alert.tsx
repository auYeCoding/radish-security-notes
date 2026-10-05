import { useTranslation } from "react-i18next";

import type { ExportFailure } from "@shared/export/export-result";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";

import { describeExportFailure } from "./describe-export-failure";

/**
 * 导出失败提示的属性.
 */
interface ExportFailureAlertProps {
  /**
   * 失败结果, 没有失败时为 undefined, 此时什么也不显示.
   */
  readonly failure: ExportFailure | undefined;
}

/**
 * 导出失败的提示条: 失败的原因写成给用户看的文案. 没有失败时什么也不显示. 确认步骤的导出失败与
 * 结果页的打开所在文件夹失败共用.
 * @param props 组件属性.
 * @returns 提示条元素, 没有失败时为空.
 */
export function ExportFailureAlert(
  props: ExportFailureAlertProps,
): React.JSX.Element {
  const { t } = useTranslation();
  if (props.failure === undefined) {
    return <></>;
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {describeExportFailure(props.failure, t)}
      </AlertDescription>
    </Alert>
  );
}
