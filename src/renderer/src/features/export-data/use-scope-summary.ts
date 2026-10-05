import { useEffect, useState } from "react";

import type { ExportScope } from "@shared/export/export-request";
import type { ExportResult } from "@shared/export/export-result";
import type { ExportScopeSummary } from "@shared/export/export-types";

import { useExportBridge } from "@renderer/stores/use-export-bridge";

/**
 * 还在统计.
 */
export interface ScopeSummaryLoading {
  /**
   * 状态, 统计中恒为 loading.
   */
  readonly status: "loading";
}

/**
 * 已统计出来.
 */
export interface ScopeSummaryReady {
  /**
   * 状态, 已统计出来恒为 ready.
   */
  readonly status: "ready";
  /**
   * 统计结果.
   */
  readonly summary: ExportScopeSummary;
}

/**
 * 统计失败.
 */
export interface ScopeSummaryFailed {
  /**
   * 状态, 统计失败恒为 failed.
   */
  readonly status: "failed";
}

/**
 * 统计一个范围的状态: 还在统计, 已统计出来, 或统计失败.
 */
export type ScopeSummaryState =
  ScopeSummaryLoading | ScopeSummaryReady | ScopeSummaryFailed;

/**
 * 一次统计的结果, 连同统计的范围一起记着, 范围变了就不再采用.
 */
interface ResolvedScope {
  /**
   * 统计的范围.
   */
  readonly scope: ExportScope;
  /**
   * 主进程返回的统计结果.
   */
  readonly result: ExportResult<ExportScopeSummary>;
}

/**
 * 让主进程统计一个范围的条目数, 附件个数与字节数, 并告知是否设了主密码. 范围变化时重新统计, 迟到的
 * 旧结果被忽略.
 * @param scope 要统计的范围, 内容不变时引用要保持不变.
 * @returns 统计的状态.
 */
export function useScopeSummary(scope: ExportScope): ScopeSummaryState {
  const bridge = useExportBridge();
  const [resolved, setResolved] = useState<ResolvedScope | undefined>(
    undefined,
  );
  useEffect(() => {
    let isCurrent = true;
    void bridge.describeScope(scope).then((result) => {
      if (isCurrent) {
        setResolved({ scope, result });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [bridge, scope]);
  if (resolved === undefined || resolved.scope !== scope) {
    return { status: "loading" };
  }
  return resolved.result.ok
    ? { status: "ready", summary: resolved.result.value }
    : { status: "failed" };
}
