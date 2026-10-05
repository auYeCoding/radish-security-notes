import { useTranslation } from "react-i18next";

import type { ExportLossItem } from "@shared/export/export-loss-reasons";

import { describeExportLoss } from "./describe-export-loss";

/**
 * 带不出内容汇总的属性.
 */
interface ExportLossListProps {
  /**
   * 汇总, 只含个数大于 0 的原因.
   */
  readonly losses: readonly ExportLossItem[];
}

/**
 * 这种格式没能带出的内容的汇总: 标题和每个原因一行带个数的说明. 只有原因与个数, 不含条目名称与
 * 任何内容. 汇总为空时什么也不显示.
 * @param props 组件属性.
 * @returns 汇总元素, 没有带不出的内容时为空.
 */
export function ExportLossList(props: ExportLossListProps): React.JSX.Element {
  const { t } = useTranslation();
  if (props.losses.length === 0) {
    return <></>;
  }
  return (
    <section className="flex flex-col gap-1 text-sm">
      <h3 className="font-medium">{t("export.result.lossesHeading")}</h3>
      <ul className="list-disc ps-5 text-muted-foreground">
        {props.losses.map((loss) => (
          <li key={loss.reason}>{describeExportLoss(loss, t)}</li>
        ))}
      </ul>
    </section>
  );
}
