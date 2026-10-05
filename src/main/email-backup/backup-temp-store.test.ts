import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  BackupTemporaryStore,
  NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
  type BackupTemporaryFileSystemPort,
} from "./backup-temp-store";

/**
 * 指向专属目录的存储.
 */
interface StoreFixture {
  /**
   * 被测的存储.
   */
  readonly store: BackupTemporaryStore;
  /**
   * 专属目录的路径.
   */
  readonly directory: string;
}

/**
 * 创建指向专属目录的存储.
 * @param baseDirectory 测试用的临时目录.
 * @param onFailure 失败回调.
 * @param fileSystem 文件系统能力, 默认是真实的.
 * @returns 存储与专属目录路径.
 */
function storeOf(
  baseDirectory: string,
  onFailure: (error: unknown) => void = () => undefined,
  fileSystem: BackupTemporaryFileSystemPort = NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
): StoreFixture {
  const directory = join(baseDirectory, "email-backup-temp");
  return {
    store: new BackupTemporaryStore({ fileSystem, directory, onFailure }),
    directory,
  };
}

describe("备份临时目录存储: 准备与删除", () => {
  const getDirectory = useTemporaryDirectory("backup-temp-store");

  it("准备路径时建立专属目录, 返回目录下的文件路径", async () => {
    const { store, directory } = storeOf(getDirectory());
    const path = await store.prepare("backup.zip");
    expect(path).toBe(join(directory, "backup.zip"));
    expect(existsSync(directory)).toBe(true);
  });

  it("删除临时文件, 文件不存在时什么也不做", async () => {
    const { store } = storeOf(getDirectory());
    const path = await store.prepare("backup.zip");
    await writeFile(path, "data");
    await store.remove(path);
    expect(existsSync(path)).toBe(false);
    await expect(store.remove(path)).resolves.toBeUndefined();
  });

  it("删除失败只通知回调, 不抛出", async () => {
    const onFailure = vi.fn();
    const { store } = storeOf(getDirectory(), onFailure, {
      ...NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
      removeFile: () => Promise.reject(new Error("busy")),
    });
    await expect(store.remove("/x")).resolves.toBeUndefined();
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});

describe("备份临时目录存储: 清扫", () => {
  const getDirectory = useTemporaryDirectory("backup-temp-sweep");

  it("清扫删除专属目录与其中的全部残留, 目录不存在时什么也不做", async () => {
    const { store, directory } = storeOf(getDirectory());
    const path = await store.prepare("leftover.zip");
    await writeFile(path, "leftover");
    store.discardAll();
    expect(existsSync(directory)).toBe(false);
    expect(() => store.discardAll()).not.toThrow();
  });

  it("清扫失败只通知回调", () => {
    const onFailure = vi.fn();
    const { store } = storeOf(getDirectory(), onFailure, {
      ...NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
      removeDirectoryTreeSync: () => {
        throw new Error("locked");
      },
    });
    expect(() => store.discardAll()).not.toThrow();
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
