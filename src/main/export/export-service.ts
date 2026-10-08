import { join } from "node:path";

import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import { describeExportFormat } from "@shared/export/export-format-capabilities";
import type { ExportTranslateKey } from "@shared/export/export-message-keys";
import type { ExportRequest, ExportScope } from "@shared/export/export-request";
import {
  exportFailed,
  exportSucceeded,
  type ExportFailureReason,
  type ExportResult,
} from "@shared/export/export-result";
import type {
  ExportProgressSnapshot,
  ExportRunOutcome,
  ExportScopeSummary,
  ExportSummary,
} from "@shared/export/export-types";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { MasterPasswordVerifier } from "../vault/master-password-verifier";
import { readExportDataset } from "./dataset/export-dataset-reader";
import type { ExportDataset } from "./dataset/export-dataset";
import { defaultExportFileName } from "./export-file-name";
import { failureReasonOf, isExportCancellation } from "./export-failure";
import type {
  ExportDialogPort,
  ExportFilePort,
  ExportShellPort,
} from "./export-ports";
import {
  createExportProgressTracker,
  type ExportProgressTracker,
} from "./export-progress";
import { findRequestViolation } from "./export-request-validation";
import { runExportPipeline } from "./export-run-pipeline";
import {
  countExportScope,
  type ExportScopeCounts,
} from "./export-scope-counter";
import { createSerializeContext } from "./export-serialize-context";
import { createExportSession } from "./export-session";
import type { ExportSerializerRegistry } from "./serializers/export-serializer-registry";

/**
 * 导出服务的依赖.
 */
export interface ExportServiceDependencies {
  /**
   * 系统对话框.
   */
  readonly dialogs: ExportDialogPort;
  /**
   * 写出导出文件的文件系统能力.
   */
  readonly file: ExportFilePort;
  /**
   * 在文件管理器里定位文件的能力.
   */
  readonly shell: ExportShellPort;
  /**
   * 格式到序列化器的登记表.
   */
  readonly serializers: ExportSerializerRegistry;
  /**
   * 读取已解锁数据库的能力, 以及意外失败的回调.
   */
  readonly database: DatabaseAccess;
  /**
   * 主密码校验器.
   */
  readonly verifier: MasterPasswordVerifier;
  /**
   * 取当前语言文案的函数.
   */
  readonly translate: (key: ExportTranslateKey) => string;
  /**
   * 保存对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
  /**
   * 读取当前时间.
   */
  readonly now: () => Date;
  /**
   * 让出事件循环.
   */
  readonly yieldToEventLoop: () => Promise<void>;
}

/**
 * 导出服务: 编排 "统计范围, 校验, 保存对话框, 读取, 序列化, 加密, 原子写出, 摘要" 的全过程. 读取,
 * 序列化, 加密与写文件都在主进程完成, 渲染端只拿到计数与摘要. 明文只在内存里停留与最终写入
 * 用户选定的文件, 同一时间只处理一次导出, 日志只写错误名.
 */
export class ExportService {
  /**
   * 导出进度的记录器.
   */
  private readonly tracker: ExportProgressTracker =
    createExportProgressTracker();

  /**
   * 最后一次导出的路径.
   */
  private readonly session = createExportSession();

  /**
   * 是否正在导出.
   */
  private isBusy = false;

  /**
   * 正在进行的导出的中止控制器.
   */
  private controller: AbortController | undefined;

  /**
   * 创建导出服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: ExportServiceDependencies) {}

  /**
   * 统计一个范围的条目数, 附件个数与字节数, 并告知保险库是否设了主密码.
   * @param scope 要统计的范围.
   * @returns 范围概况, 未解锁与意外失败时为失败结果.
   */
  async describeScope(
    scope: ExportScope,
  ): Promise<ExportResult<ExportScopeSummary>> {
    try {
      const hasMasterPassword =
        await this.dependencies.verifier.hasMasterPassword();
      const counts = this.countScope(scope);
      return counts.ok
        ? exportSucceeded({ ...counts.value, hasMasterPassword })
        : counts;
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return exportFailed("unexpected-error");
    }
  }

  /**
   * 执行一次导出. 请求不合规, 主密码不对, 范围里没有条目或超过上限时在弹出保存对话框之前
   * 就拒绝, 不读取任何条目内容.
   * @param request 导出请求.
   * @returns 用户取消, 或导出摘要; 失败时目标位置不会留下残缺的文件.
   */
  async run(request: ExportRequest): Promise<ExportResult<ExportRunOutcome>> {
    if (this.isBusy) {
      return exportFailed("busy");
    }
    const controller = new AbortController();
    this.isBusy = true;
    this.controller = controller;
    this.session.clear();
    this.tracker.reset();
    try {
      return await this.execute(request, controller.signal);
    } catch (error) {
      return this.failureOf(error);
    } finally {
      controller.abort();
      this.isBusy = false;
      this.controller = undefined;
      this.tracker.reset();
    }
  }

  /**
   * 读取当前导出的进度.
   * @returns 进度快照.
   */
  getProgress(): ExportProgressSnapshot {
    return this.tracker.snapshot();
  }

  /**
   * 判断是否正在导出.
   * @returns 进行中为 true.
   */
  hasRunningTask(): boolean {
    return this.isBusy;
  }

  /**
   * 取消: 正在导出时中止写出并清理临时文件; 没有进行中的导出时让服务忘掉最近一次导出的路径.
   */
  cancel(): void {
    if (this.controller === undefined) {
      this.session.clear();
      this.tracker.reset();
      return;
    }
    this.controller.abort();
  }

  /**
   * 在文件管理器里定位最近一次导出的文件, 路径不经渲染端.
   * @returns 定位结果; 没有保留的路径或定位失败时为失败结果.
   */
  revealFile(): ExportResult<undefined> {
    const path = this.session.lastPath();
    if (path === undefined) {
      return exportFailed("no-finished-export");
    }
    try {
      this.dependencies.shell.showItemInFolder(path);
      return exportSucceeded(undefined);
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return exportFailed("reveal-failed");
    }
  }

  /**
   * 导出的各个步骤: 校验, 主密码, 范围, 保存对话框, 读取与写出.
   * @param request 导出请求.
   * @param signal 中止信号.
   * @returns 导出结果.
   */
  private async execute(
    request: ExportRequest,
    signal: AbortSignal,
  ): Promise<ExportResult<ExportRunOutcome>> {
    const rejected = await this.findRejection(request);
    if (rejected !== undefined) {
      return exportFailed(rejected);
    }
    const targetPath = await this.chooseTarget(request);
    if (targetPath === undefined || signal.aborted) {
      return exportSucceeded({ status: "cancelled" });
    }
    const dataset = this.readDataset(request);
    if (!dataset.ok) {
      return dataset;
    }
    const summary = await this.write(
      request,
      dataset.value,
      targetPath,
      signal,
    );
    this.session.remember(targetPath);
    return exportSucceeded({ status: "saved", summary });
  }

  /**
   * 弹出保存对话框之前的全部检查, 按代价从小到大: 请求本身, 主密码, 范围条目数.
   * @param request 导出请求.
   * @returns 第一个不通过的检查对应的失败原因, 都通过时为 undefined.
   */
  private async findRejection(
    request: ExportRequest,
  ): Promise<ExportFailureReason | undefined> {
    const violation = findRequestViolation(request);
    if (violation !== undefined) {
      return violation;
    }
    if (!(await this.isAuthorized(request))) {
      return "wrong-master-password";
    }
    const counts = this.countScope(request.scope);
    if (!counts.ok) {
      return counts.reason;
    }
    if (counts.value.entryCount === 0) {
      return "no-entries";
    }
    return counts.value.entryCount > MAX_TRANSFER_ENTRIES
      ? "too-many-entries"
      : undefined;
  }

  /**
   * 判断用户是否通过了主密码校验: 没设主密码的保险库不需要, 设了就必须给出正确的主密码.
   * @param request 导出请求.
   * @returns 通过时为 true.
   */
  private async isAuthorized(request: ExportRequest): Promise<boolean> {
    const { verifier } = this.dependencies;
    if (!(await verifier.hasMasterPassword())) {
      return true;
    }
    return (
      request.masterPassword !== undefined &&
      (await verifier.verify(request.masterPassword))
    );
  }

  /**
   * 统计范围的计数.
   * @param scope 导出的范围.
   * @returns 范围的计数, 未解锁或出错时为失败结果.
   */
  private countScope(scope: ExportScope): ExportResult<ExportScopeCounts> {
    return runWithDatabase<ExportScopeCounts, ExportFailureReason>(
      this.dependencies.database,
      (orm) => exportSucceeded(countExportScope(orm, scope)),
    );
  }

  /**
   * 弹出系统保存对话框, 预填默认文件名与格式的类型过滤器.
   * @param request 导出请求.
   * @returns 用户选定的路径, 取消时为 undefined.
   */
  private chooseTarget(request: ExportRequest): Promise<string | undefined> {
    const { translate } = this.dependencies;
    const isEncrypted = request.passphrase !== undefined;
    const capability = describeExportFormat(request.format);
    return this.dependencies.dialogs.showSaveDialog({
      title: translate("export.dialog.saveTitle"),
      defaultPath: join(
        this.dependencies.defaultDirectory,
        defaultExportFileName(
          request.format,
          isEncrypted,
          this.dependencies.now(),
        ),
      ),
      filterName: translate(
        isEncrypted
          ? "export.dialog.filter.encrypted"
          : `export.dialog.filter.${request.format}`,
      ),
      extensions: [isEncrypted ? "age" : capability.fileExtension],
    });
  }

  /**
   * 在一个只读事务里读出范围内的数据集.
   * @param request 导出请求.
   * @returns 数据集, 未解锁或出错时为失败结果.
   */
  private readDataset(request: ExportRequest): ExportResult<ExportDataset> {
    this.tracker.begin("preparing");
    const capability = describeExportFormat(request.format);
    return runWithDatabase<ExportDataset, ExportFailureReason>(
      this.dependencies.database,
      (orm) =>
        exportSucceeded(
          readExportDataset(orm, {
            scope: request.scope,
            includeSecrets: request.includeSecrets,
            includeAttachments:
              request.includeAttachments && capability.canCarryAttachments,
          }),
        ),
    );
  }

  /**
   * 序列化, 加密并原子写出, 报告进度.
   * @param request 导出请求.
   * @param dataset 数据集.
   * @param targetPath 目标文件的路径.
   * @param signal 中止信号.
   * @returns 导出摘要; 失败或被中止时拒绝.
   */
  private async write(
    request: ExportRequest,
    dataset: ExportDataset,
    targetPath: string,
    signal: AbortSignal,
  ): Promise<ExportSummary> {
    const { dependencies, tracker } = this;
    const serializer = dependencies.serializers.require(request.format);
    const totalSteps = serializer.countSteps(dataset);
    tracker.begin("writing");
    tracker.advance(0, totalSteps);
    const { payload, fileSizeBytes } = await runExportPipeline({
      dataset,
      serializer,
      context: createSerializeContext({
        createdAt: dependencies.now(),
        getOrm: dependencies.database.getOrm,
        translate: dependencies.translate,
        tracker,
        totalSteps,
        yieldToEventLoop: dependencies.yieldToEventLoop,
        signal,
      }),
      passphrase: request.passphrase,
      file: dependencies.file,
      targetPath,
      signal,
      onWritten: () => tracker.begin("finishing"),
    });
    return {
      format: request.format,
      entryCount: payload.entryCount,
      attachmentCount: payload.attachmentCount,
      fileSizeBytes,
      includesAttachments:
        dataset.includesAttachments &&
        describeExportFormat(request.format).canCarryAttachments,
      includesSecrets: dataset.includesSecrets,
      isEncrypted: request.passphrase !== undefined,
      losses: payload.losses,
    };
  }

  /**
   * 把导出过程中抛出的错误换成结果: 取消是取消结果, 其余只报错误名并返回对应的失败原因.
   * @param error 抛出的错误.
   * @returns 取消的成功结果, 或失败结果.
   */
  private failureOf(error: unknown): ExportResult<ExportRunOutcome> {
    if (isExportCancellation(error)) {
      return exportSucceeded({ status: "cancelled" });
    }
    this.dependencies.database.onFailure(error);
    return exportFailed(failureReasonOf(error));
  }
}
