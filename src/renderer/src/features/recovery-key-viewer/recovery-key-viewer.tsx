import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

import { RecoveryKeyVerifyDialog } from "./recovery-key-verify-dialog";
import { RecoveryKeyWordsDialog } from "./recovery-key-words-dialog";

/**
 * 查看恢复密钥对话框都没打开的进度.
 */
interface ClosedStage {
  /**
   * 进度的种类, 关闭时恒为 "closed".
   */
  readonly kind: "closed";
}

/**
 * 验证身份的进度.
 */
interface VerifyStage {
  /**
   * 进度的种类, 验证身份时恒为 "verify".
   */
  readonly kind: "verify";
  /**
   * 恢复词是否刚被自动隐藏, 是则验证对话框里说明需要重新验证.
   */
  readonly isAutoHidden: boolean;
}

/**
 * 显示恢复词的进度, 恢复词只存在于这个进度里.
 */
interface ShownStage {
  /**
   * 进度的种类, 显示恢复词时恒为 "shown".
   */
  readonly kind: "shown";
  /**
   * 正在显示的 24 个恢复词.
   */
  readonly words: readonly string[];
}

/**
 * 查看恢复密钥的进度: 关闭, 验证身份, 或显示恢复词.
 */
type ViewerStage = ClosedStage | VerifyStage | ShownStage;

/**
 * 查看恢复密钥的初始进度.
 */
const CLOSED_STAGE: ViewerStage = { kind: "closed" };

/**
 * 查看恢复密钥的入口: 一个按钮, 点开先验证身份, 通过后显示 24 个恢复词. 对话框关闭, 点 "隐藏" 或
 * 自动隐藏时词都从内存清除, 再看必须重新验证, 验证结果不缓存.
 * @returns 按钮与按需打开的对话框元素.
 */
export function RecoveryKeyViewer(): React.JSX.Element {
  const { t } = useTranslation();
  const [stage, setStage] = useState<ViewerStage>(CLOSED_STAGE);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setStage({ kind: "verify", isAutoHidden: false })}
      >
        {t("settings.security.recoveryKey.action")}
      </Button>
      {stage.kind === "verify" && (
        <RecoveryKeyVerifyDialog
          isAutoHidden={stage.isAutoHidden}
          onClose={() => setStage(CLOSED_STAGE)}
          onVerified={(words) => setStage({ kind: "shown", words })}
        />
      )}
      {stage.kind === "shown" && (
        <RecoveryKeyWordsDialog
          words={stage.words}
          onHide={() => setStage({ kind: "verify", isAutoHidden: false })}
          onAutoHide={() => setStage({ kind: "verify", isAutoHidden: true })}
          onClose={() => setStage(CLOSED_STAGE)}
        />
      )}
    </>
  );
}
