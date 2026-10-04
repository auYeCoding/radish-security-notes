import { vi } from "vitest";

import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";
import {
  attachmentFailed,
  attachmentSucceeded,
} from "@shared/attachments/attachment-result";
import type { AttachmentMeta } from "@shared/attachments/attachment-types";

/**
 * 假附件桥里预览返回的 data: 地址, 是一张 1 像素的 PNG.
 */
export const FAKE_PREVIEW_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

/**
 * 假附件桥里通过选择文件对话框添加的默认附件.
 */
export const FAKE_DIALOG_ATTACHMENT = { name: "新附件.txt", size: 1234 };

/**
 * 假附件桥里的初始附件, 键是条目编号.
 */
export type FakeAttachmentsByEntry = Readonly<
  Record<string, readonly AttachmentMeta[]>
>;

/**
 * 一个待添加的文件的名称与字节数.
 */
interface FakeFileFacts {
  /**
   * 文件名.
   */
  readonly name: string;
  /**
   * 文件的字节数.
   */
  readonly size: number;
}

/**
 * 假附件桥背后按条目存放附件的内存仓库.
 */
interface FakeAttachmentStorage {
  /**
   * 读出一个条目的附件.
   * @param entryId 条目编号.
   * @returns 附件元数据的副本.
   */
  readonly list: (entryId: string) => AttachmentMeta[];
  /**
   * 给一个条目追加附件.
   * @param entryId 条目编号.
   * @param files 要追加的文件.
   * @returns 新增附件的元数据.
   */
  readonly append: (
    entryId: string,
    files: readonly FakeFileFacts[],
  ) => readonly AttachmentMeta[];
  /**
   * 按编号删除一个附件.
   * @param attachmentId 附件编号.
   */
  readonly remove: (attachmentId: string) => void;
}

/**
 * 创建假附件桥背后的内存仓库, 新附件的编号依次为 fake-att-1, fake-att-2.
 * @param initial 初始附件, 键是条目编号.
 * @returns 内存仓库.
 */
function createFakeStorage(
  initial: FakeAttachmentsByEntry,
): FakeAttachmentStorage {
  const stored = new Map<string, AttachmentMeta[]>(
    Object.entries(initial).map(([entryId, items]) => [entryId, [...items]]),
  );
  let counter = 0;
  return {
    list: (entryId) => [...(stored.get(entryId) ?? [])],
    append: (entryId, files) => {
      const added = files.map((file) => ({
        id: `fake-att-${(counter += 1)}`,
        name: file.name,
        size: file.size,
      }));
      stored.set(entryId, [...(stored.get(entryId) ?? []), ...added]);
      return added;
    },
    remove: (attachmentId) =>
      stored.forEach((items, entryId) =>
        stored.set(
          entryId,
          items.filter((item) => item.id !== attachmentId),
        ),
      ),
  };
}

/**
 * 创建组件测试用的假附件桥: 每个方法都是间谍, 附件按条目放在内存里. 选择文件对话框添加一个
 * 固定的附件, 拖入添加与拖入文件同名同大小的附件, 另存为, 打开成功, 预览返回固定的图片地址,
 * 删除把附件从内存里移走.
 * @param initial 初始附件, 键是条目编号.
 * @param overrides 覆盖假桥上的方法, 例如让添加失败.
 * @returns 假附件桥.
 */
export function createFakeAttachmentBridge(
  initial: FakeAttachmentsByEntry = {},
  overrides: Partial<AttachmentBridge> = {},
): AttachmentBridge {
  const storage = createFakeStorage(initial);
  return {
    list: vi.fn((entryId) =>
      Promise.resolve(attachmentSucceeded(storage.list(entryId))),
    ),
    addFromDialog: vi.fn((entryId) =>
      Promise.resolve(
        attachmentSucceeded({
          status: "added" as const,
          attachments: storage.append(entryId, [FAKE_DIALOG_ATTACHMENT]),
        }),
      ),
    ),
    addDropped: vi.fn((entryId, files) =>
      Promise.resolve(
        attachmentSucceeded({
          status: "added" as const,
          attachments: storage.append(entryId, files),
        }),
      ),
    ),
    saveAs: vi.fn(() => Promise.resolve(attachmentSucceeded("saved" as const))),
    open: vi.fn(() => Promise.resolve(attachmentSucceeded(undefined))),
    preview: vi.fn(() =>
      Promise.resolve(attachmentSucceeded(FAKE_PREVIEW_DATA_URL)),
    ),
    remove: vi.fn((attachmentId) => {
      storage.remove(attachmentId);
      return Promise.resolve(attachmentSucceeded(undefined));
    }),
    ...overrides,
  };
}

/**
 * 让假桥的某个方法失败, 用于测试失败路径.
 * @param reason 失败原因.
 * @param fileName 导致失败的文件名, 与具体文件无关时省略.
 * @returns 总是返回失败结果的间谍.
 */
export function failingAttachmentWith(
  reason: Parameters<typeof attachmentFailed>[0],
  fileName?: string,
): () => Promise<ReturnType<typeof attachmentFailed>> {
  return vi.fn(() => Promise.resolve(attachmentFailed(reason, fileName)));
}
