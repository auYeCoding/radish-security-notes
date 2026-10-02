import type { VaultStatus } from "@shared/vault/vault-status";

import type { GateFrameLayout } from "@renderer/components/gate-frame";
import { RecoverySetupScreen } from "@renderer/features/vault-recovery-setup/recovery-setup-screen";
import { RestoreScreen } from "@renderer/features/vault-recovery-restore/restore-screen";
import { VaultFailureScreen } from "@renderer/features/vault-failure/vault-failure-screen";
import { OnboardingScreen } from "@renderer/features/vault-onboarding/onboarding-screen";
import { UnlockScreen } from "@renderer/features/vault-unlock/unlock-screen";

/**
 * 选择整屏页面所依据的保险库状态.
 */
export interface GateScreenInput {
  /**
   * 保险库当前的状态.
   */
  readonly status: VaultStatus;
  /**
   * 刚设置完保险库, 还没有展示并确认的恢复词.
   */
  readonly pendingRecoveryWords: readonly string[] | undefined;
  /**
   * 用户是否选择了凭恢复词恢复.
   */
  readonly isRestoreRequested: boolean;
}

/**
 * 选出的整屏页面和它所在外框的版式.
 */
export interface GateScreenSelection {
  /**
   * 整屏页面元素.
   */
  readonly screen: React.JSX.Element;
  /**
   * 外框的版式.
   */
  readonly layout: GateFrameLayout;
}

/**
 * 引导页, 解锁页与失败页的外框版式, 与恢复功能加入之前一致.
 */
const DEFAULT_LAYOUT: GateFrameLayout = {
  spacing: "default",
  isPrintKit: false,
};

/**
 * 恢复页的外框版式: 页面可能比窗口高, 上下留宽, 不打印.
 */
const RESTORE_LAYOUT: GateFrameLayout = {
  spacing: "roomy",
  isPrintKit: false,
};

/**
 * 恢复词页的外框版式: 上下留宽, 打印时只留恢复套件.
 */
const RECOVERY_SETUP_LAYOUT: GateFrameLayout = {
  spacing: "roomy",
  isPrintKit: true,
};

/**
 * 在解锁页或失败页之间按用户是否选择了恢复挑出页面.
 * @param isRestoreRequested 用户是否选择了凭恢复词恢复.
 * @param fallback 没有选择恢复时显示的页面.
 * @returns 恢复页或原页面.
 */
function orRestoreScreen(
  isRestoreRequested: boolean,
  fallback: React.JSX.Element,
): GateScreenSelection {
  return isRestoreRequested
    ? { screen: <RestoreScreen />, layout: RESTORE_LAYOUT }
    : { screen: fallback, layout: DEFAULT_LAYOUT };
}

/**
 * 按保险库状态选出整屏页面与它的外框版式. 有待确认的恢复词时无论状态如何都先显示恢复词页,
 * 确认之前不进入三栏主界面.
 * @param input 保险库状态, 待确认的恢复词与是否选择了恢复.
 * @returns 整屏页面与外框版式, 已解锁且没有待确认的恢复词时为 undefined, 表示该显示三栏主界面.
 */
export function selectGateScreen(
  input: GateScreenInput,
): GateScreenSelection | undefined {
  if (input.pendingRecoveryWords !== undefined) {
    return {
      screen: <RecoverySetupScreen words={input.pendingRecoveryWords} />,
      layout: RECOVERY_SETUP_LAYOUT,
    };
  }
  switch (input.status) {
    case "unlocked":
      return undefined;
    case "needs-setup":
      return { screen: <OnboardingScreen />, layout: DEFAULT_LAYOUT };
    case "locked":
      return orRestoreScreen(input.isRestoreRequested, <UnlockScreen />);
    default:
      return orRestoreScreen(input.isRestoreRequested, <VaultFailureScreen />);
  }
}
