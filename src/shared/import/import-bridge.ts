import type { ImportResult } from "./import-result";
import type { ImportSourceKey } from "./import-source-keys";
import type {
  ImportChooseOutcome,
  ImportOutcome,
  ImportProgressSnapshot,
  ImportReportSaveOutcome,
  ImportRunOptions,
} from "./import-types";

/**
 * preload 暴露给渲染进程的导入接口. 来源文件在主进程里选择, 读取与解析, 渲染端只拿到概要与
 * 最终的未能带入清单, 拿不到任何条目的内容.
 */
export interface ImportBridge {
  /**
   * 让主进程弹出选择文件对话框, 读取并解析所选文件, 把解析结果留在主进程内存里等待确认.
   * @param sourceKey 来源与文件格式的键.
   * @returns 用户取消, 或解析概要; 文件不合规时为失败结果.
   */
  chooseFile: (
    sourceKey: ImportSourceKey,
  ) => Promise<ImportResult<ImportChooseOutcome>>;
  /**
   * 确认导入主进程内存里等待确认的解析结果.
   * @param options 重复条目的处理方式.
   * @returns 导入概况与未能带入清单; 没有等待确认的导入, 或数据库出错时为失败结果, 数据库出错时
   * 整次导入都没有生效.
   */
  run: (options: ImportRunOptions) => Promise<ImportResult<ImportOutcome>>;
  /**
   * 读取当前导入的进度.
   * @returns 进度快照.
   */
  getProgress: () => Promise<ImportProgressSnapshot>;
  /**
   * 放弃等待确认的导入, 或在导入结束后让主进程释放保留的信息.
   * @returns 释放后兑现.
   */
  cancel: () => Promise<void>;
  /**
   * 让主进程弹出保存对话框, 把最近一次导入的未能带入清单写成文本文件.
   * @returns 已保存, 或用户取消.
   */
  saveReport: () => Promise<ImportResult<ImportReportSaveOutcome>>;
  /**
   * 让主进程在系统文件管理器里定位最近一次导入的来源文件, 路径不经渲染端.
   * @returns 定位结果.
   */
  revealFile: () => Promise<ImportResult<undefined>>;
}
