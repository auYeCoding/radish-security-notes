import type { ExportRequest, ExportScope } from "./export-request";
import type { ExportResult } from "./export-result";
import type {
  ExportProgressSnapshot,
  ExportRunOutcome,
  ExportScopeSummary,
} from "./export-types";

/**
 * preload 暴露给渲染进程的导出接口. 数据在主进程里读取, 序列化, 加密并写成文件, 渲染端只送范围,
 * 选项, 口令与主密码, 只拿到计数与导出摘要, 拿不到任何条目的内容与文件路径.
 */
export interface ExportBridge {
  /**
   * 统计一个范围的条目数, 附件个数与字节数, 并告知保险库是否设了主密码.
   * @param scope 要统计的范围.
   * @returns 范围概况, 未解锁时为失败结果.
   */
  describeScope: (
    scope: ExportScope,
  ) => Promise<ExportResult<ExportScopeSummary>>;
  /**
   * 执行一次导出: 校验请求与主密码, 弹出保存对话框, 读取数据, 序列化, 加密并写成文件.
   * @param request 导出请求.
   * @returns 用户取消, 或导出摘要; 请求不合规, 主密码错误, 写文件失败等为失败结果, 失败时
   * 不会留下残缺的文件.
   */
  run: (request: ExportRequest) => Promise<ExportResult<ExportRunOutcome>>;
  /**
   * 读取当前导出的进度.
   * @returns 进度快照.
   */
  getProgress: () => Promise<ExportProgressSnapshot>;
  /**
   * 取消正在进行的导出, 没有进行中的导出时让主进程忘掉最近一次导出的文件路径.
   * @returns 处理后兑现.
   */
  cancel: () => Promise<void>;
  /**
   * 让主进程在系统文件管理器里定位最近一次导出的文件, 路径不经渲染端.
   * @returns 定位结果.
   */
  revealFile: () => Promise<ExportResult<undefined>>;
}
