import { findEmailBackupSettingsProblems } from "@shared/email-backup/email-backup-settings-rules";

import { EmailAccountSection } from "./email-account-section";
import { EmailBackupAuthorizationField } from "./email-backup-authorization-field";
import { EmailBackupContentSection } from "./email-backup-content-section";
import { settingsOfDraft } from "./email-backup-draft";
import type { EmailBackupFlow } from "./use-email-backup-flow";

/**
 * 表单的属性.
 */
interface EmailBackupFormProps {
  /**
   * 邮箱备份对话框的流程.
   */
  readonly flow: EmailBackupFlow;
}

/**
 * 邮箱备份表单: 邮箱账号区, 备份内容区, 设了主密码时的主密码字段. 处理期间整个表单不可编辑. 表单
 * 不提交, 保存, 测试与备份都由操作区的按钮触发.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function EmailBackupForm(
  props: EmailBackupFormProps,
): React.JSX.Element {
  const { flow } = props;
  const { draft, view, activity, notice } = flow.state;
  const failureReason = notice.kind === "failure" ? notice.reason : undefined;
  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <fieldset
        disabled={activity !== "idle"}
        className="flex min-w-0 flex-col gap-6"
      >
        <EmailAccountSection
          draft={draft}
          view={view}
          problems={findEmailBackupSettingsProblems(settingsOfDraft(draft))}
          isAuthenticationFailed={failureReason === "authentication-failed"}
          onChange={flow.changeDraft}
          onProviderChange={flow.changeProvider}
        />
        <EmailBackupContentSection
          draft={draft}
          view={view}
          onChange={flow.changeDraft}
        />
        {view.requiresMasterPassword && (
          <EmailBackupAuthorizationField
            value={draft.masterPassword}
            isWrong={failureReason === "wrong-master-password"}
            onChange={(masterPassword) => flow.changeDraft({ masterPassword })}
          />
        )}
      </fieldset>
    </form>
  );
}
