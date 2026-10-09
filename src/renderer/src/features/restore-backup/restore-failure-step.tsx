import { useTranslation } from "react-i18next";

import type { RestoreFailure } from "@shared/restore/restore-result";

import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import { describeRestoreBackupFailure } from "./describe-restore-backup-failure";

/**
 * 失败步骤的属性.
 */
interface RestoreFailureStepProps {
  /**
   * 失败的结果.
   */
  readonly failure: RestoreFailure;
  /**
   * 点 "重新选择" 时的回调.
   */
  readonly onBack: () => void;
}

/**
 * 不能继续的失败的步骤: 失败的原因写成给用户看的文案 (内容不合规与超过上限时写出第一个问题),
 * 和 "重新选择" 按钮.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function RestoreFailureStep(
  props: RestoreFailureStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <DialogScrollBody>
        <Alert variant="destructive">
          <AlertDescription>
            {describeRestoreBackupFailure(props.failure, t)}
          </AlertDescription>
        </Alert>
      </DialogScrollBody>
      <DialogFooter>
        <Button onClick={props.onBack}>{t("restore.failure.back")}</Button>
      </DialogFooter>
    </>
  );
}
