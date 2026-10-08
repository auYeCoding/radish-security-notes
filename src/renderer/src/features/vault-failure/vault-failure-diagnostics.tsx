import { useTranslation } from "react-i18next";

import type { VaultFailureInfo } from "@shared/vault/vault-failure";

import { CopyButton } from "@renderer/components/copy-button";

import { formatFailureDiagnostics } from "./format-failure-diagnostics";

/**
 * 诊断信息区域的属性.
 */
interface VaultFailureDiagnosticsProps {
  /**
   * 主进程记录的失败信息.
   */
  readonly failure: VaultFailureInfo;
}

/**
 * 把文本写入系统剪贴板. 诊断文本不含密钥材料, 直接在渲染端写入, 不经主进程清理剪贴板.
 * @param text 要写入的文本.
 * @returns 写入成功时兑现为 true, 被拒绝时为 false.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 失败页上的诊断信息: 一行原因, 阶段与错误类名, 旁边有复制按钮, 用户遇到问题时可复制后提交.
 * @param props 组件属性.
 * @returns 诊断信息元素.
 */
export function VaultFailureDiagnostics(
  props: VaultFailureDiagnosticsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const text = formatFailureDiagnostics(props.failure);
  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t("vault.failure.diagnostics.label")}
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 font-mono text-xs break-all">
          {text}
        </code>
        <CopyButton
          label={t("vault.failure.diagnostics.copy")}
          copiedLabel={t("vault.failure.diagnostics.copied")}
          onCopy={() => copyText(text)}
        />
      </div>
    </div>
  );
}
