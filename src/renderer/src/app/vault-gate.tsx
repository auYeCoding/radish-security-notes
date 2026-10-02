import { GateFrame } from "@renderer/components/gate-frame";
import { PreferencesSwitchers } from "@renderer/features/preferences-switchers/preferences-switchers";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { selectGateScreen } from "./select-gate-screen";
import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 保险库门控: 解锁之前只显示引导页, 解锁页, 恢复页或失败页, 设置之后先显示恢复词页, 确认
 * 之前不进入三栏主界面; 解锁后的工作区 (三栏主界面) 在已解锁且恢复词已确认后才挂载. 整屏页面
 * 的右上角放主题与语言切换.
 * @returns 当前状态对应的界面.
 */
export function VaultGate(): React.JSX.Element {
  const status = useVaultStore((state) => state.status);
  const pendingRecoveryWords = useVaultStore(
    (state) => state.pendingRecoveryWords,
  );
  const isRestoreRequested = useVaultStore((state) => state.isRestoreRequested);
  const selection = selectGateScreen({
    status,
    pendingRecoveryWords,
    isRestoreRequested,
  });
  if (selection === undefined) {
    return <UnlockedWorkspace />;
  }
  return (
    <GateFrame corner={<PreferencesSwitchers />} {...selection.layout}>
      {selection.screen}
    </GateFrame>
  );
}
