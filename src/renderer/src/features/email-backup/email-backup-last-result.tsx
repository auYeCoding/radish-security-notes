import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { EmailBackupLastResult } from "@shared/email-backup/email-backup-result";

import { describeEmailBackupFailure } from "./describe-email-backup-failure";
import { formatBackupTime } from "./format-backup-time";

/**
 * 上次备份结果行的属性.
 */
interface EmailBackupLastResultLineProps {
  /**
   * 上次备份的结果, 从没备份过时为 undefined.
   */
  readonly lastResult: EmailBackupLastResult | undefined;
}

/**
 * 把上次结果写成给用户看的一句话: 时间, 成功或失败, 失败时带原因.
 * @param lastResult 上次备份的结果.
 * @param translate 翻译函数.
 * @param language 当前界面语言.
 * @returns 一句话.
 */
function describeLastResult(
  lastResult: EmailBackupLastResult,
  translate: TFunction,
  language: string,
): string {
  const time = formatBackupTime(lastResult.completedAt, language);
  if (lastResult.outcome === "success") {
    return translate("emailBackup.lastResult.success", { time });
  }
  const reason = describeEmailBackupFailure(
    lastResult.reason ?? "unexpected-error",
    translate,
  );
  return translate("emailBackup.lastResult.failure", { time, reason });
}

/**
 * 上次备份的结果行: 标题加一句话. 从没备份过时写明还没有备份.
 * @param props 组件属性.
 * @returns 上次结果元素.
 */
export function EmailBackupLastResultLine(
  props: EmailBackupLastResultLineProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { lastResult } = props;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-medium">
        {t("emailBackup.lastResult.heading")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {lastResult === undefined
          ? t("emailBackup.lastResult.none")
          : describeLastResult(lastResult, t, i18n.language)}
      </p>
    </div>
  );
}
