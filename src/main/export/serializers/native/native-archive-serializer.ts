import { Readable } from "node:stream";

import { ZipFile } from "yazl";

import type { ExportDataset } from "../../dataset/export-dataset";
import {
  ExportAttachmentMissingError,
  ExportCancelledError,
} from "../../export-errors";
import { createChunkPacer } from "../export-chunk-pacer";
import type {
  ExportPayload,
  ExportSerializeContext,
  ExportSerializer,
} from "../export-serializer";
import { streamJsonDocument } from "../json-document-stream";
import { readableOfText } from "../text-stream";
import {
  NATIVE_MANIFEST_PATH,
  NATIVE_VAULT_PATH,
  nativeAttachmentPath,
} from "./native-format-version";
import { buildNativeManifest, countNativeAttachments } from "./native-manifest";
import { buildNativeVaultParts } from "./native-vault-document";

/**
 * 让整个压缩包以一个错误结束的函数.
 */
type FailArchive = (error: Error) => void;

/**
 * 取压缩包的输出流, 作为可读流交给后面的加密与写文件.
 * @param zip 压缩包.
 * @returns 输出流.
 * @throws Error 当输出流不是 Node 的可读流时.
 */
function outputStreamOf(zip: ZipFile): Readable {
  const { outputStream } = zip;
  if (!(outputStream instanceof Readable)) {
    throw new Error("压缩包的输出流不是可读流");
  }
  return outputStream;
}

/**
 * 给交给压缩包读取的流挂上错误处理. yazl 不转发读取流的错误, 没有监听者的错误会变成未捕获的
 * 异常, 所以读取流出错时统一让整个压缩包以这个错误结束.
 * @param stream 交给压缩包读取的流.
 * @param fail 让压缩包以错误结束的函数.
 * @returns 同一个流.
 */
function guarded(stream: Readable, fail: FailArchive): Readable {
  stream.on("error", fail);
  return stream;
}

/**
 * 写入清单与保险库数据文件. 清单是小文件, 直接写入; 保险库数据文件按需逐个条目生成, 不会一次
 * 拼成一个大字符串.
 * @param zip 压缩包.
 * @param dataset 数据集.
 * @param context 序列化用到的外部能力.
 * @param fail 让压缩包以错误结束的函数.
 */
function addDocuments(
  zip: ZipFile,
  dataset: ExportDataset,
  context: ExportSerializeContext,
  fail: FailArchive,
): void {
  const manifest = buildNativeManifest(dataset, context.createdAt);
  zip.addBuffer(
    Buffer.from(`${JSON.stringify(manifest, undefined, 2)}\n`, "utf8"),
    NATIVE_MANIFEST_PATH,
    { mtime: context.createdAt, compress: true },
  );
  const pacer = createChunkPacer(context);
  zip.addReadStreamLazy(
    NATIVE_VAULT_PATH,
    { mtime: context.createdAt, compress: true },
    (callback) =>
      callback(
        null,
        guarded(
          readableOfText(
            streamJsonDocument(buildNativeVaultParts(dataset), pacer.tick),
          ),
          fail,
        ),
      ),
  );
}

/**
 * 写入一个附件的内容: 轮到它时才从库里读出全部字节, 找不到或用户已取消时让整个压缩包出错.
 * @param zip 压缩包.
 * @param attachmentId 附件编号.
 * @param context 序列化用到的外部能力.
 */
function addAttachment(
  zip: ZipFile,
  attachmentId: string,
  context: ExportSerializeContext,
): void {
  zip.addReadStreamLazy(
    nativeAttachmentPath(attachmentId),
    { mtime: context.createdAt, compress: false },
    (callback) => {
      const content = context.readAttachment(attachmentId);
      if (context.isCancelled()) {
        callback(new ExportCancelledError(), Readable.from([]));
      } else if (content === undefined) {
        callback(new ExportAttachmentMissingError(), Readable.from([]));
      } else {
        const stream = Readable.from([content]);
        stream.once("end", () => context.advanceProgress(1));
        callback(null, stream);
      }
    },
  );
}

/**
 * 本应用完整格式的序列化器: ZIP 容器, 先是 `manifest.json`, `vault.json`, 然后是每个附件的内容.
 * 文件不含附件时只有前两个文件.
 */
export const nativeArchiveSerializer: ExportSerializer = {
  key: "native",
  countSteps: (dataset) =>
    dataset.entries.length + countNativeAttachments(dataset),
  serialize: (dataset, context): ExportPayload => {
    const zip = new ZipFile();
    const stream = outputStreamOf(zip);
    const fail: FailArchive = (error) => stream.destroy(error);
    zip.on("error", fail);
    addDocuments(zip, dataset, context, fail);
    if (dataset.includesAttachments) {
      for (const entry of dataset.entries) {
        for (const attachment of entry.attachments) {
          addAttachment(zip, attachment.id, context);
        }
      }
    }
    zip.end();
    return {
      stream,
      entryCount: dataset.entries.length,
      attachmentCount: countNativeAttachments(dataset),
      losses: [],
    };
  },
};
