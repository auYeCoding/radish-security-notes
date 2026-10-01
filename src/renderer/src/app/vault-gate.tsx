import type { VaultStatus } from "@shared/vault/vault-status";

import { GateFrame } from "@renderer/components/gate-frame";
import { PreferencesSwitchers } from "@renderer/features/preferences-switchers/preferences-switchers";
import { VaultFailureScreen } from "@renderer/features/vault-failure/vault-failure-screen";
import { OnboardingScreen } from "@renderer/features/vault-onboarding/onboarding-screen";
import { UnlockScreen } from "@renderer/features/vault-unlock/unlock-screen";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 按保险库状态选出整屏页面.
 * @param status 尚未解锁的保险库状态.
 * @returns 对应的页面元素.
 */
function renderGateScreen(
  status: Exclude<VaultStatus, "unlocked">,
): React.JSX.Element {
  switch (status) {
    case "needs-setup":
      return <OnboardingScreen />;
    case "locked":
      return <UnlockScreen />;
    default:
      return <VaultFailureScreen />;
  }
}

/**
 * 保险库门控: 解锁之前只显示引导页, 解锁页或失败页, 解锁后的工作区 (三栏主界面) 在
 * 已解锁后才挂载. 整屏页面的右上角放主题与语言切换.
 * @returns 当前状态对应的界面.
 */
export function VaultGate(): React.JSX.Element {
  const status = useVaultStore((state) => state.status);
  if (status === "unlocked") {
    return <UnlockedWorkspace />;
  }
  return (
    <GateFrame corner={<PreferencesSwitchers />}>
      {renderGateScreen(status)}
    </GateFrame>
  );
}
