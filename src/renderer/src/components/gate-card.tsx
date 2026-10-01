import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@renderer/components/ui/card";

/**
 * 整屏页面卡片的属性.
 */
interface GateCardProps {
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
 * 整屏页面里居中的卡片: 标题, 可选说明和正文. 引导页, 解锁页与失败页共用.
 * @param props 组件属性.
 * @returns 卡片元素.
 */
export function GateCard(props: GateCardProps): React.JSX.Element {
  return (
    <Card className="w-full max-w-sm">
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
