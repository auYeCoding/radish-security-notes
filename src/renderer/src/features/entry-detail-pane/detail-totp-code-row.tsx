import { useTranslation } from "react-i18next";

import { TotpCodeButton } from "@renderer/components/totp-code-button";
import { TotpCountdown } from "@renderer/components/totp-countdown";
import { useTotpBridge } from "@renderer/stores/use-totp-bridge";

import { DetailField } from "./detail-field";
import { useTotpCode } from "./use-totp-code";

/**
 * 详情验证码行的属性.
 */
interface DetailTotpCodeRowProps {
  /**
   * 带 TOTP 的条目编号. 条目换了就换组件, 调用方要用条目编号作 key.
   */
  readonly entryId: string;
}

/**
 * 详情里的验证码行: 标签是 "验证码", 下方是点击即复制的当前验证码, 再下方是剩余秒数与进度条.
 * 验证码由主进程生成, 复制由主进程在点击瞬间重新生成并写入剪贴板, 到期时自动换成下一个.
 * @param props 组件属性.
 * @returns 验证码行元素.
 */
export function DetailTotpCodeRow(
  props: DetailTotpCodeRowProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const bridge = useTotpBridge();
  const state = useTotpCode(props.entryId);
  const label = t("entryTotp.codeLabel");
  return (
    <DetailField label={label}>
      {state.status === "failed" ? (
        <span className="text-muted-foreground">
          {t("entryTotp.loadFailed")}
        </span>
      ) : null}
      {state.status === "ready" ? (
        <div className="flex flex-col gap-2">
          <TotpCodeButton
            code={state.code}
            label={t("entryDetail.copyField", { label })}
            copiedLabel={t("entryDetail.copied")}
            onCopy={async () => (await bridge.copyCode(props.entryId)).ok}
          />
          <TotpCountdown
            remainingSeconds={state.remainingSeconds}
            periodSeconds={state.periodSeconds}
            isEnding={state.isEnding}
            remainingText={t("entryTotp.remaining", {
              seconds: state.remainingSeconds,
            })}
            endingText={t("entryTotp.ending")}
            progressLabel={t("entryTotp.progressLabel")}
          />
        </div>
      ) : null}
    </DetailField>
  );
}
