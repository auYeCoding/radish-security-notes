import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { app, shell } from "electron";
import type { i18n } from "i18next";

import { AttachmentCandidateReader } from "../attachments/attachment-candidate-reader";
import { readAttachmentDialogLabels } from "../attachments/attachment-dialog-labels";
import { AttachmentExporter } from "../attachments/attachment-exporter";
import type { AttachmentDialogPort } from "../attachments/attachment-file-port";
import { AttachmentImporter } from "../attachments/attachment-importer";
import { AttachmentOpener } from "../attachments/attachment-opener";
import { AttachmentPreviewer } from "../attachments/attachment-previewer";
import { AttachmentService } from "../attachments/attachment-service";
import {
  NODE_ATTACHMENT_SINK,
  NODE_ATTACHMENT_SOURCE,
  NODE_TEMPORARY_COPY_FILE_SYSTEM,
} from "../attachments/node-attachment-file-system";
import { TemporaryCopyStore } from "../attachments/temporary-copy-store";
import type { VaultService } from "../vault/vault-service";
import {
  showOpenDialogOnFocusedWindow,
  showSaveDialogOnFocusedWindow,
} from "./electron-dialogs";
import { reportFailureName } from "./report-failure-name";

/**
 * 附件失败日志的前缀.
 */
const ATTACHMENT_FAILURE_SCOPE = "附件";

/**
 * 明文临时副本的专属目录名, 在用户数据目录之下.
 */
const TEMPORARY_COPY_DIRECTORY_NAME = "attachment-open";

/**
 * 附件相关的运行时对象.
 */
export interface AttachmentRuntime {
  /**
   * 附件服务, 负责列出, 写库, 读出与删除.
   */
  readonly service: AttachmentService;
  /**
   * 导入器, 负责从选择文件对话框与拖入的路径添加附件.
   */
  readonly importer: AttachmentImporter;
  /**
   * 另存为执行器.
   */
  readonly exporter: AttachmentExporter;
  /**
   * 用系统默认程序打开附件的打开器.
   */
  readonly opener: AttachmentOpener;
  /**
   * 图片预览器.
   */
  readonly previewer: AttachmentPreviewer;
  /**
   * 删除专属目录里的全部明文临时副本, 应用退出时调用.
   */
  readonly discardTemporaryCopies: () => void;
}

/**
 * 基于 Electron 对话框的系统对话框能力: 选择文件对话框可多选, 保存对话框不加类型过滤器.
 */
const ELECTRON_ATTACHMENT_DIALOGS: AttachmentDialogPort = {
  showOpenDialog: (request) =>
    showOpenDialogOnFocusedWindow({
      title: request.title,
      defaultPath: request.defaultDirectory,
      properties: ["openFile", "multiSelections"],
    }),
  showSaveDialog: (request) =>
    showSaveDialogOnFocusedWindow({
      title: request.title,
      defaultPath: request.defaultPath,
    }),
};

/**
 * 创建明文临时副本存储, 并清扫上次运行残留的副本. 必须在 app ready 之后调用.
 * @param onFailure 删除或创建失败时的回调.
 * @returns 临时副本存储.
 */
function createTemporaryCopies(
  onFailure: (error: unknown) => void,
): TemporaryCopyStore {
  const copies = new TemporaryCopyStore({
    fileSystem: NODE_TEMPORARY_COPY_FILE_SYSTEM,
    baseDirectory: join(app.getPath("userData"), TEMPORARY_COPY_DIRECTORY_NAME),
    createIdentifier: randomUUID,
    onFailure,
  });
  copies.discardAll();
  return copies;
}

/**
 * 创建附件相关的运行时对象: 附件服务读写保险库已解锁的加密数据库, 文件对话框与文件读写在主进程
 * 里完成, 附件内容不经渲染端 (图片预览除外). 失败只把错误名称写入日志. 必须在 app ready 之后
 * 调用, 因为系统路径要求如此.
 * @param vault 保险库服务.
 * @param translator 主进程的 i18next 实例, 对话框标题随它的当前语言.
 * @returns 附件运行时对象.
 */
export function createAttachmentRuntime(
  vault: VaultService,
  translator: i18n,
): AttachmentRuntime {
  const onFailure = (error: unknown): void =>
    reportFailureName(ATTACHMENT_FAILURE_SCOPE, error);
  const service = new AttachmentService({
    getOrm: () => vault.getOrm(),
    createIdentifier: randomUUID,
    onFailure,
  });
  const defaultDirectory = app.getPath("documents");
  const readDialogLabels = (): ReturnType<typeof readAttachmentDialogLabels> =>
    readAttachmentDialogLabels(translator);
  const copies = createTemporaryCopies(onFailure);
  return {
    service,
    importer: new AttachmentImporter({
      service,
      reader: new AttachmentCandidateReader({
        source: NODE_ATTACHMENT_SOURCE,
        onFailure,
      }),
      dialogs: ELECTRON_ATTACHMENT_DIALOGS,
      readDialogLabels,
      defaultDirectory,
    }),
    exporter: new AttachmentExporter({
      service,
      dialogs: ELECTRON_ATTACHMENT_DIALOGS,
      sink: NODE_ATTACHMENT_SINK,
      readDialogLabels,
      defaultDirectory,
      createIdentifier: randomUUID,
      onFailure,
    }),
    opener: new AttachmentOpener({
      service,
      copies,
      shell: { openPath: (filePath) => shell.openPath(filePath) },
      onFailure,
    }),
    previewer: new AttachmentPreviewer(service),
    discardTemporaryCopies: () => copies.discardAll(),
  };
}
