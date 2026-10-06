import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import { RestoreNotIncludedNotice } from "./restore-not-included-notice";

/**
 * 选择文件步骤的属性.
 */
interface RestorePickStepProps {
  /**
   * 点 "选择备份文件" 时的回调.
   */
  readonly onChooseFile: () => void;
}

/**
 * 选择备份文件的步骤: 支持的文件说明, 会恢复什么, 不在备份里的内容和 "选择备份文件" 按钮. 文件由
 * 主进程弹出系统对话框选择.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function RestorePickStep(
  props: RestorePickStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t("restore.pick.intro")}
        </p>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">
            {t("restore.pick.included.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("restore.pick.included.body")}
          </p>
        </div>
        <RestoreNotIncludedNotice />
      </div>
      <DialogFooter>
        <Button onClick={props.onChooseFile}>{t("restore.pick.choose")}</Button>
      </DialogFooter>
    </>
  );
}
