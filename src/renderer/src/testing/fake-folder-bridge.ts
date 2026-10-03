import type { FolderBridge } from "@shared/folders/folder-bridge";
import { isSameFolderName } from "@shared/folders/folder-name-match";
import { createFolderNameSchema } from "@shared/folders/folder-name-schema";
import {
  folderFailed,
  folderSucceeded,
  type FolderResult,
} from "@shared/folders/folder-result";
import type { FolderSummary } from "@shared/folders/folder-types";
import { vi } from "vitest";

/**
 * 校验名称并检查重名, 与主进程的文件夹服务规则一致.
 * @param folders 现有的文件夹.
 * @param name 用户填写的名称.
 * @param ownIdentifier 重命名时自己的编号, 新建时为 undefined.
 * @returns 去空格后的名称, 或失败结果.
 */
function checkName(
  folders: readonly FolderSummary[],
  name: string,
  ownIdentifier: string | undefined,
): string | FolderResult<never> {
  const parsed = createFolderNameSchema().safeParse({ name });
  if (!parsed.success) {
    return folderFailed("invalid-input");
  }
  const taken = folders.some(
    (folder) =>
      folder.id !== ownIdentifier &&
      isSameFolderName(folder.name, parsed.data.name),
  );
  return taken ? folderFailed("name-taken") : parsed.data.name;
}

/**
 * 创建组件测试用的假文件夹桥: 文件夹存在内存里, 先创建的在前, 每个方法都是间谍. 放入条目默认
 * 成功, 条目的归属由条目 store 在内存里更新, 假桥不记录.
 * @param initial 初始文件夹, 按创建先后排列.
 * @param overrides 覆盖假桥上的方法, 例如让删除失败.
 * @returns 假文件夹桥.
 */
export function createFakeFolderBridge(
  initial: readonly FolderSummary[] = [],
  overrides: Partial<FolderBridge> = {},
): FolderBridge {
  const folders = [...initial];
  let created = 0;
  return {
    list: vi.fn(() => Promise.resolve(folderSucceeded([...folders]))),
    create: vi.fn((name: string) => {
      const checked = checkName(folders, name, undefined);
      if (typeof checked !== "string") {
        return Promise.resolve(checked);
      }
      created += 1;
      const folder = { id: `created-folder-${created}`, name: checked };
      folders.push(folder);
      return Promise.resolve(folderSucceeded(folder));
    }),
    rename: vi.fn((id: string, name: string) => {
      const index = folders.findIndex((folder) => folder.id === id);
      if (index < 0) {
        return Promise.resolve(folderFailed("not-found"));
      }
      const checked = checkName(folders, name, id);
      if (typeof checked !== "string") {
        return Promise.resolve(checked);
      }
      const renamed = { id, name: checked };
      folders[index] = renamed;
      return Promise.resolve(folderSucceeded(renamed));
    }),
    remove: vi.fn((id: string) => {
      const index = folders.findIndex((folder) => folder.id === id);
      if (index < 0) {
        return Promise.resolve(folderFailed("not-found"));
      }
      folders.splice(index, 1);
      return Promise.resolve(folderSucceeded(undefined));
    }),
    assignEntry: vi.fn(() => Promise.resolve(folderSucceeded(undefined))),
    ...overrides,
  };
}
