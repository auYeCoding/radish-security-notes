import { useTranslation } from "react-i18next";

import { SwitchField } from "@renderer/components/switch-field";
import { detachPromise } from "@renderer/lib/detach-promise";
import { usePreferencesStore } from "@renderer/stores/use-preferences-store";

/**
 * 内容保护开关: 反映偏好里的当前值, 点击后立即经主进程保存并应用到窗口. 开关旁的文字固定是 "启用",
 * 不随状态变化, 整个开关组以所属设置行的名称命名. 保存失败时开关保持原值, 失败不再向外抛.
 * @returns 开关元素.
 */
export function ContentProtectionToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const isEnabled = usePreferencesStore(
    (state) => state.isContentProtectionEnabled,
  );
  const setEnabled = usePreferencesStore(
    (state) => state.setContentProtectionEnabled,
  );
  return (
    <div
      role="group"
      aria-label={t("settings.security.contentProtection.name")}
    >
      <SwitchField
        label={t("settings.security.contentProtection.toggleLabel")}
        isChecked={isEnabled}
        onCheckedChange={(isChecked) => detachPromise(setEnabled(isChecked))}
      />
    </div>
  );
}
