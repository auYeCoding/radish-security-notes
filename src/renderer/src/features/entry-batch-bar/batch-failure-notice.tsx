import { useTranslation } from "react-i18next";

import { DismissibleAlert } from "@renderer/components/dismissible-alert";

/**
 * 批量操作失败提示的属性.
 */
interface BatchFailureNoticeProps {
  /**
   * 失败的文案.
   */
  readonly message: string;
  /**
   * 点关闭按钮时的回调.
   */
  readonly onDismiss: () => void;
}

/**
 * 选择栏下方的批量操作失败提示: 说明失败原因与整批都没有执行, 带关闭按钮. 提示条由共用的
 * 可关闭提示条提供, 自带 `role="alert"`, 屏幕阅读器会立即朗读.
 * @param props 组件属性.
 * @returns 失败提示元素.
 */
export function BatchFailureNotice(
  props: BatchFailureNoticeProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="border-b border-border p-2">
      <DismissibleAlert
        message={props.message}
        dismissLabel={t("batch.dismiss")}
        onDismiss={props.onDismiss}
      />
    </div>
  );
}
