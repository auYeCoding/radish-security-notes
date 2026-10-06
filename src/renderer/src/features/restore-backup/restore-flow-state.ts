import type {
  RestoreFailure,
  RestoreResult,
} from "@shared/restore/restore-result";
import type {
  RestoreChooseOutcome,
  RestoreOutcome,
  RestorePreview,
  RestoreReadyOutcome,
} from "@shared/restore/restore-types";

/**
 * 选择备份文件的步骤.
 */
export interface PickStepState {
  /**
   * 步骤名.
   */
  readonly step: "pick";
}

/**
 * 输入备份口令的步骤: 所选文件是口令加密的备份, 文件保留在主进程里.
 */
export interface PassphraseStepState {
  /**
   * 步骤名.
   */
  readonly step: "passphrase";
  /**
   * 所选文件的字节数.
   */
  readonly fileSizeBytes: number;
  /**
   * 正在输入的口令.
   */
  readonly passphrase: string;
  /**
   * 上一次提交的口令是否不对.
   */
  readonly isPassphraseWrong: boolean;
}

/**
 * 预览与确认的步骤.
 */
export interface PreviewStepState {
  /**
   * 步骤名.
   */
  readonly step: "preview";
  /**
   * 备份概要.
   */
  readonly preview: RestorePreview;
  /**
   * 重新输入的主密码.
   */
  readonly masterPassword: string;
  /**
   * 是否已勾选 "我明白这些数据将被永久删除".
   */
  readonly hasAcknowledgedReplace: boolean;
  /**
   * 上一次提交的主密码是否不对.
   */
  readonly isMasterPasswordWrong: boolean;
}

/**
 * 主进程正在读取并解析所选文件的处理.
 */
export interface ChoosingWorkState {
  /**
   * 步骤名.
   */
  readonly step: "working";
  /**
   * 处理的种类, 选择并读取文件恒为 choosing.
   */
  readonly task: "choosing";
}

/**
 * 主进程正在用口令解开备份的处理.
 */
export interface DecryptingWorkState {
  /**
   * 步骤名.
   */
  readonly step: "working";
  /**
   * 处理的种类, 解密恒为 decrypting.
   */
  readonly task: "decrypting";
  /**
   * 所选文件的字节数, 口令不对时回到输入口令的步骤要用.
   */
  readonly fileSizeBytes: number;
}

/**
 * 主进程正在写库的处理. 带着预览与勾选, 主密码不对时回到预览步骤要用.
 */
export interface RestoringWorkState {
  /**
   * 步骤名.
   */
  readonly step: "working";
  /**
   * 处理的种类, 写库恒为 restoring.
   */
  readonly task: "restoring";
  /**
   * 备份概要.
   */
  readonly preview: RestorePreview;
  /**
   * 是否已勾选 "我明白这些数据将被永久删除".
   */
  readonly hasAcknowledgedReplace: boolean;
}

/**
 * 主进程正在处理的步骤.
 */
export type WorkingStepState =
  ChoosingWorkState | DecryptingWorkState | RestoringWorkState;

/**
 * 恢复结果的步骤.
 */
export interface ResultStepState {
  /**
   * 步骤名.
   */
  readonly step: "result";
  /**
   * 恢复概况.
   */
  readonly outcome: RestoreOutcome;
}

/**
 * 不能继续的失败的步骤, 只能回到选择文件.
 */
export interface FailureStepState {
  /**
   * 步骤名.
   */
  readonly step: "failure";
  /**
   * 失败的结果.
   */
  readonly failure: RestoreFailure;
}

/**
 * 恢复对话框的流程状态.
 */
export type RestoreFlowState =
  | PickStepState
  | PassphraseStepState
  | PreviewStepState
  | WorkingStepState
  | ResultStepState
  | FailureStepState;

/**
 * 恢复对话框打开时的初始状态.
 */
export const INITIAL_RESTORE_FLOW_STATE: RestoreFlowState = { step: "pick" };

/**
 * 由备份概要得到刚进入预览步骤的状态: 主密码为空, 没有勾选, 没有口令错误.
 * @param preview 备份概要.
 * @returns 预览步骤的状态.
 */
function toPreviewState(preview: RestorePreview): PreviewStepState {
  return {
    step: "preview",
    preview,
    masterPassword: "",
    hasAcknowledgedReplace: false,
    isMasterPasswordWrong: false,
  };
}

/**
 * 由失败的结果得到失败步骤的状态.
 * @param failure 失败的结果.
 * @returns 失败步骤的状态.
 */
function toFailureState(failure: RestoreFailure): FailureStepState {
  return { step: "failure", failure };
}

/**
 * 开始选择并读取备份文件. 只在选择文件的步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function startChoosing(state: RestoreFlowState): RestoreFlowState {
  return state.step === "pick" ? { step: "working", task: "choosing" } : state;
}

/**
 * 把选择文件的结果应用到状态上: 失败进入失败步骤, 取消回到选择文件, 需要口令进入输入口令,
 * 已就绪进入预览. 只在选择文件的处理中生效, 用户关闭对话框之后才返回的结果因此不会改写状态.
 * @param state 当前状态.
 * @param result 主进程返回的选择文件结果.
 * @returns 新状态.
 */
export function applyChooseResult(
  state: RestoreFlowState,
  result: RestoreResult<RestoreChooseOutcome>,
): RestoreFlowState {
  if (state.step !== "working" || state.task !== "choosing") {
    return state;
  }
  if (!result.ok) {
    return toFailureState(result);
  }
  switch (result.value.status) {
    case "needs-passphrase":
      return {
        step: "passphrase",
        fileSizeBytes: result.value.fileSizeBytes,
        passphrase: "",
        isPassphraseWrong: false,
      };
    case "ready":
      return toPreviewState(result.value.preview);
    default:
      return INITIAL_RESTORE_FLOW_STATE;
  }
}

/**
 * 改动正在输入的口令, 上一次的口令错误提示随之作废. 只在输入口令的步骤里生效.
 * @param state 当前状态.
 * @param passphrase 新的口令.
 * @returns 新状态.
 */
export function changePassphrase(
  state: RestoreFlowState,
  passphrase: string,
): RestoreFlowState {
  return state.step === "passphrase"
    ? { ...state, passphrase, isPassphraseWrong: false }
    : state;
}

/**
 * 开始解密. 口令交给主进程之后不再留在状态里. 只在输入口令的步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function startDecrypting(state: RestoreFlowState): RestoreFlowState {
  return state.step === "passphrase"
    ? {
        step: "working",
        task: "decrypting",
        fileSizeBytes: state.fileSizeBytes,
      }
    : state;
}

/**
 * 把提交口令的结果应用到状态上: 口令不对回到输入口令并清空口令, 其它失败进入失败步骤, 已就绪
 * 进入预览. 只在解密的处理中生效.
 * @param state 当前状态.
 * @param result 主进程返回的提交口令结果.
 * @returns 新状态.
 */
export function applyPassphraseResult(
  state: RestoreFlowState,
  result: RestoreResult<RestoreReadyOutcome>,
): RestoreFlowState {
  if (state.step !== "working" || state.task !== "decrypting") {
    return state;
  }
  if (result.ok) {
    return toPreviewState(result.value.preview);
  }
  return result.reason === "wrong-passphrase"
    ? {
        step: "passphrase",
        fileSizeBytes: state.fileSizeBytes,
        passphrase: "",
        isPassphraseWrong: true,
      }
    : toFailureState(result);
}

/**
 * 改动重新输入的主密码, 上一次的主密码错误提示随之作废. 只在预览步骤里生效.
 * @param state 当前状态.
 * @param masterPassword 新的主密码.
 * @returns 新状态.
 */
export function changeMasterPassword(
  state: RestoreFlowState,
  masterPassword: string,
): RestoreFlowState {
  return state.step === "preview"
    ? { ...state, masterPassword, isMasterPasswordWrong: false }
    : state;
}

/**
 * 勾选或取消勾选 "我明白这些数据将被永久删除". 只在预览步骤里生效.
 * @param state 当前状态.
 * @param hasAcknowledgedReplace 是否勾选.
 * @returns 新状态.
 */
export function changeAcknowledgedReplace(
  state: RestoreFlowState,
  hasAcknowledgedReplace: boolean,
): RestoreFlowState {
  return state.step === "preview"
    ? { ...state, hasAcknowledgedReplace }
    : state;
}

/**
 * 开始写库. 主密码交给主进程之后不再留在状态里. 只在预览步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function startRestoring(state: RestoreFlowState): RestoreFlowState {
  return state.step === "preview"
    ? {
        step: "working",
        task: "restoring",
        preview: state.preview,
        hasAcknowledgedReplace: state.hasAcknowledgedReplace,
      }
    : state;
}

/**
 * 把确认恢复的结果应用到状态上: 成功进入结果页, 主密码不对回到预览并清空主密码, 其它失败进入
 * 失败步骤. 只在写库的处理中生效.
 * @param state 当前状态.
 * @param result 主进程返回的恢复结果.
 * @returns 新状态.
 */
export function applyRunResult(
  state: RestoreFlowState,
  result: RestoreResult<RestoreOutcome>,
): RestoreFlowState {
  if (state.step !== "working" || state.task !== "restoring") {
    return state;
  }
  if (result.ok) {
    return { step: "result", outcome: result.value };
  }
  return result.reason === "wrong-master-password"
    ? {
        ...toPreviewState(state.preview),
        hasAcknowledgedReplace: state.hasAcknowledgedReplace,
        isMasterPasswordWrong: true,
      }
    : toFailureState(result);
}

/**
 * 回到选择文件. 只在输入口令, 预览与失败的步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function backToPick(state: RestoreFlowState): RestoreFlowState {
  return state.step === "passphrase" ||
    state.step === "preview" ||
    state.step === "failure"
    ? INITIAL_RESTORE_FLOW_STATE
    : state;
}
