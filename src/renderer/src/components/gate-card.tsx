import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@renderer/components/ui/card";
import { cn } from "@renderer/lib/class-names";

/**
 * 整屏页面卡片的属性.
 */
interface GateCardProps {
  /**
   * 卡片宽度: 默认是窄卡片, 恢复词页需要放下 24 个词的网格时用宽卡片.
   */
  readonly size?: "default" | "wide";
  /**
   * 打印时是否隐藏卡片, 默认不隐藏. 带打印套件的恢复词页打印时只留套件, 传入 true.
   */
  readonly isHiddenOnPrint?: boolean;
  /**
   * 页面标题, 同时是页面的一级标题.
   */
  readonly title: string;
  /**
   * 标题下方的说明, 没有说明时省略.
   */
  readonly description?: string;
  /**
   * 卡片正文, 通常是表单.
   */
  readonly children?: ReactNode;
}

/**
 * 各卡片宽度对应的最大宽度类名.
 */
const GATE_CARD_WIDTH_CLASSES = {
  default: "max-w-sm",
  wide: "max-w-3xl",
} as const;

/**
 * 整屏页面里居中的卡片: 标题, 可选说明和正文. 引导页, 解锁页, 失败页与恢复相关页面共用.
 * @param props 组件属性.
 * @returns 卡片元素.
 */
export function GateCard(props: GateCardProps): React.JSX.Element {
  return (
    <Card
      className={cn(
        "w-full",
        GATE_CARD_WIDTH_CLASSES[props.size ?? "default"],
        props.isHiddenOnPrint === true && "print:hidden",
      )}
    >
      <CardHeader>
        <CardTitle
          role="heading"
          aria-level={1}
          className="text-xl font-semibold"
        >
          {props.title}
        </CardTitle>
        {props.description !== undefined && (
          <CardDescription>{props.description}</CardDescription>
        )}
      </CardHeader>
      {props.children !== undefined && (
        <CardContent>{props.children}</CardContent>
      )}
    </Card>
  );
}
