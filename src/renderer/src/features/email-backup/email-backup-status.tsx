import { EmailBackupLastResultLine } from "./email-backup-last-result";
import { EmailBackupNoticeView } from "./email-backup-notice-view";
import { EmailBackupProgressView } from "./email-backup-progress-view";
import type { EmailBackupFlow } from "./use-email-backup-flow";

/**
 * 状态区的属性.
 */
interface EmailBackupStatusProps {
  /**
   * 邮箱备份对话框的流程.
   */
  readonly flow: EmailBackupFlow;
}

/**
 * 状态区: 处理期间显示进度, 其后显示提示 (已保存, 测试邮件已发出, 备份摘要, 超限提示, 失败原因),
 * 最后是上次备份的结果. 页面上没有授权码, 口令, 邮箱地址与任何条目内容.
 * @param props 组件属性.
 * @returns 状态区元素.
 */
export function EmailBackupStatus(
  props: EmailBackupStatusProps,
): React.JSX.Element {
  const { flow } = props;
  const { state } = flow;
  return (
    <div className="flex flex-col gap-4">
      {state.activity !== "idle" && (
        <EmailBackupProgressView
          activity={state.activity}
          progress={flow.progress}
        />
      )}
      <EmailBackupNoticeView
        notice={state.notice}
        onDropAttachments={() => void flow.runBackup(true)}
        onCancel={flow.dismissNotice}
      />
      <EmailBackupLastResultLine lastResult={state.lastResult} />
    </div>
  );
}
