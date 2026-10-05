import type { ExportDataset } from "./dataset/export-dataset";
import { writeFileAtomically } from "./atomic-export-writer";
import { encryptExportStream } from "./export-encryption";
import type { ExportFilePort } from "./export-ports";
import type {
  ExportPayload,
  ExportSerializeContext,
  ExportSerializer,
} from "./serializers/export-serializer";

/**
 * 运行导出流水线的参数.
 */
export interface ExportPipelineRequest {
  /**
   * 数据集.
   */
  readonly dataset: ExportDataset;
  /**
   * 格式对应的序列化器.
   */
  readonly serializer: ExportSerializer;
  /**
   * 序列化用到的外部能力.
   */
  readonly context: ExportSerializeContext;
  /**
   * 加密口令, 不加密时没有这一项.
   */
  readonly passphrase: string | undefined;
  /**
   * 文件系统能力.
   */
  readonly file: ExportFilePort;
  /**
   * 目标文件的路径.
   */
  readonly targetPath: string;
  /**
   * 中止信号.
   */
  readonly signal: AbortSignal;
  /**
   * 字节流全部写进临时文件之后, 刷盘与改名之前调用.
   */
  readonly onWritten: () => void;
}

/**
 * 导出流水线的结果.
 */
export interface ExportPipelineResult {
  /**
   * 序列化器的产出, 带计数与带不出内容的汇总.
   */
  readonly payload: ExportPayload;
  /**
   * 写出的文件的字节数.
   */
  readonly fileSizeBytes: number;
}

/**
 * 运行导出流水线: 序列化成字节流, 需要时口令加密, 再原子地写成目标文件. 加密失败时销毁已经
 * 建好的字节流.
 * @param request 流水线参数.
 * @returns 序列化器的产出与文件字节数; 失败或被中止时拒绝, 目标位置不会留下残缺的文件.
 */
export async function runExportPipeline(
  request: ExportPipelineRequest,
): Promise<ExportPipelineResult> {
  const payload = request.serializer.serialize(
    request.dataset,
    request.context,
  );
  try {
    const source =
      request.passphrase === undefined
        ? payload.stream
        : await encryptExportStream(payload.stream, request.passphrase);
    const fileSizeBytes = await writeFileAtomically({
      file: request.file,
      targetPath: request.targetPath,
      source,
      signal: request.signal,
      onWritten: request.onWritten,
    });
    return { payload, fileSizeBytes };
  } catch (error) {
    payload.stream.destroy();
    throw error;
  }
}
