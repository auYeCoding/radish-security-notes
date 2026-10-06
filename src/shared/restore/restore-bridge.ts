import type { RestoreResult } from "./restore-result";
import type {
  RestoreChooseOutcome,
  RestoreOutcome,
  RestoreProgressSnapshot,
  RestoreReadyOutcome,
  RestoreRunRequest,
} from "./restore-types";

/**
 * preload 暴露给渲染进程的恢复接口. 备份文件在主进程里选择, 读取, 解密, 解包与校验, 渲染端
 * 只拿到概要与结果摘要, 拿不到路径, 口令之外的任何输入输出, 也拿不到任何条目的内容.
 */
export interface RestoreBridge {
  /**
   * 让主进程弹出选择文件对话框, 读取所选文件: 明文备份直接解包校验并给出预览, 口令加密的备份
   * 先告知需要口令.
   * @returns 用户取消, 需要口令, 或备份已就绪; 不是备份文件, 文件过大, 内容不合规时为失败结果.
   */
  chooseFile: () => Promise<RestoreResult<RestoreChooseOutcome>>;
  /**
   * 用口令解开已选的加密备份, 解包校验并给出预览. 口令只用于这一次调用, 不保存.
   * @param passphrase 备份的加密口令.
   * @returns 备份已就绪; 口令不对时为 wrong-passphrase, 仍保留所选文件, 可以重试.
   */
  submitPassphrase: (
    passphrase: string,
  ) => Promise<RestoreResult<RestoreReadyOutcome>>;
  /**
   * 确认恢复主进程内存里等待确认的备份.
   * @param request 主密码与替换确认.
   * @returns 恢复概况; 没有等待确认的备份, 主密码不对, 保险库非空却未确认替换, 或数据库出错时
   * 为失败结果, 失败时库里没有任何变化.
   */
  run: (request: RestoreRunRequest) => Promise<RestoreResult<RestoreOutcome>>;
  /**
   * 读取当前恢复的进度.
   * @returns 进度快照.
   */
  getProgress: () => Promise<RestoreProgressSnapshot>;
  /**
   * 放弃所选文件与等待确认的备份, 让主进程释放内存里的内容.
   * @returns 释放后兑现.
   */
  cancel: () => Promise<void>;
}
