import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@renderer/components/copy-button";
import { RevealToggleButton } from "@renderer/components/reveal-toggle-button";
import { useTotpBridge } from "@renderer/stores/use-totp-bridge";

import { DetailField } from "./detail-field";
import { SecretValue } from "./secret-value";

/**
 * 详情 TOTP 密钥行的属性.
 */
interface DetailTotpSecretRowProps {
  /**
   * 带 TOTP 的条目编号. 条目换了就换组件, 调用方要用条目编号作 key.
   */
  readonly entryId: string;
}

/**
 * 详情里的 TOTP 密钥行: 默认遮罩, 密钥不随条目详情进入渲染端; 点击显示时才向主进程取回并放进
 * 组件状态, 点击隐藏或切换条目后丢弃. 复制由主进程把密钥写入剪贴板, 不必先显示.
 * @param props 组件属性.
 * @returns TOTP 密钥行元素.
 */
export function DetailTotpSecretRow(
  props: DetailTotpSecretRowProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const bridge = useTotpBridge();
  const [secret, setSecret] = useState<string | undefined>(undefined);
  const label = t("entryTotp.secretLabel");
  const toggle = async (): Promise<void> => {
    if (secret !== undefined) {
      setSecret(undefined);
      return;
    }
    const result = await bridge.revealSecret(props.entryId);
    if (result.ok) {
      setSecret(result.value);
    }
  };
  return (
    <DetailField
      label={label}
      actions={
        <>
          <RevealToggleButton
            isRevealed={secret !== undefined}
            onToggle={() => void toggle()}
            showLabel={t("entryDetail.showField", { label })}
            hideLabel={t("entryDetail.hideField", { label })}
          />
          <CopyButton
            label={t("entryDetail.copyField", { label })}
            copiedLabel={t("entryDetail.copied")}
            onCopy={async () => (await bridge.copySecret(props.entryId)).ok}
          />
        </>
      }
    >
      <SecretValue
        value={secret}
        isRevealed={secret !== undefined}
        hiddenText={t("entryDetail.fieldHidden", { label })}
      />
    </DetailField>
  );
}
