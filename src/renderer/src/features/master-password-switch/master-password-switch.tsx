import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SwitchField } from "@renderer/components/switch-field";

import { DisableMasterPasswordDialog } from "./disable-master-password-dialog";
import { EnableMasterPasswordDialog } from "./enable-master-password-dialog";
import {
  useMasterPasswordState,
  type MasterPasswordState,
} from "./use-master-password-state";

/**
 * 当前打开的对话框: 开启, 关闭, 或没有.
 */
type OpenDialog = "enable" | "disable" | undefined;

/**
 * 开关在各状态下显示的文字所用的文案键.
 */
const STATE_LABEL_KEYS = {
  loading: "settings.security.masterPassword.state.loading",
  enabled: "settings.security.masterPassword.state.enabled",
  disabled: "settings.security.masterPassword.state.disabled",
  unavailable: "settings.security.masterPassword.state.unavailable",
} as const satisfies Record<MasterPasswordState, string>;

/**
 * 主密码开关: 开关反映主进程里密钥文件当前的保护方式. 点开关不直接翻转, 只打开开启或关闭对话框,
 * 取消或失败时开关保持原状, 成功后重新向主进程读取状态. 读取中与无法读取时开关不可改.
 * @returns 开关与按需打开的对话框元素.
 */
export function MasterPasswordSwitch(): React.JSX.Element {
  const { t } = useTranslation();
  const { state, refresh } = useMasterPasswordState();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(undefined);
  const closeDialog = (): void => setOpenDialog(undefined);
  const handleSucceeded = (): void => {
    closeDialog();
    refresh();
  };
  return (
    <>
      <div role="group" aria-label={t("settings.security.masterPassword.name")}>
        <SwitchField
          label={t(STATE_LABEL_KEYS[state])}
          isChecked={state === "enabled"}
          isDisabled={state === "loading" || state === "unavailable"}
          onCheckedChange={(isChecked) =>
            setOpenDialog(isChecked ? "enable" : "disable")
          }
        />
      </div>
      {openDialog === "enable" && (
        <EnableMasterPasswordDialog
          onClose={closeDialog}
          onSucceeded={handleSucceeded}
        />
      )}
      {openDialog === "disable" && (
        <DisableMasterPasswordDialog
          onClose={closeDialog}
          onSucceeded={handleSucceeded}
        />
      )}
    </>
  );
}
