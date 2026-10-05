import { rmSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

/**
 * 备份临时目录需要的文件系统能力.
 */
export interface BackupTemporaryFileSystemPort {
  /**
   * 建立目录, 目录已存在时什么也不做, 上级目录不存在时一并建立.
   * @param directory 目录路径.
   * @returns 建好之后兑现.
   */
  readonly makeDirectory: (directory: string) => Promise<void>;
  /**
   * 删除一个文件, 文件不存在时什么也不做.
   * @param filePath 文件路径.
   * @returns 删除之后兑现.
   */
  readonly removeFile: (filePath: string) => Promise<void>;
  /**
   * 同步删除一个目录与其中的全部内容, 目录不存在时什么也不做.
   * @param directory 目录路径.
   */
  readonly removeDirectoryTreeSync: (directory: string) => void;
}

/**
 * 备份临时目录只有当前用户可进入.
 */
const TEMPORARY_DIRECTORY_MODE = 0o700;

/**
 * 基于 Node 文件系统的备份临时目录能力.
 */
export const NODE_BACKUP_TEMPORARY_FILE_SYSTEM: BackupTemporaryFileSystemPort =
  {
    makeDirectory: async (directory) => {
      await mkdir(directory, {
        recursive: true,
        mode: TEMPORARY_DIRECTORY_MODE,
      });
    },
    removeFile: (filePath) => rm(filePath, { force: true }),
    removeDirectoryTreeSync: (directory) => {
      rmSync(directory, { recursive: true, force: true });
    },
  };

/**
 * 备份临时目录存储的依赖.
 */
export interface BackupTemporaryStoreDependencies {
  /**
   * 文件系统能力.
   */
  readonly fileSystem: BackupTemporaryFileSystemPort;
  /**
   * 存放备份临时文件的专属目录, 在用户数据目录之下.
   */
  readonly directory: string;
  /**
   * 删除失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 备份临时目录存储: 备份文件先在专属目录里生成, 发完或失败后立即删除; 应用启动与退出时再整个
 * 清扫一遍, 清除上次崩溃残留. 删除失败只通知回调, 留到下次启动时再清扫.
 */
export class BackupTemporaryStore {
  /**
   * 创建备份临时目录存储.
   * @param dependencies 存储依赖.
   */
  constructor(
    private readonly dependencies: BackupTemporaryStoreDependencies,
  ) {}

  /**
   * 准备一个临时文件的路径: 保证专属目录存在.
   * @param fileName 备份文件名.
   * @returns 临时文件的完整路径, 文件还没有创建.
   * @throws Error 当建立目录失败时.
   */
  async prepare(fileName: string): Promise<string> {
    const { fileSystem, directory } = this.dependencies;
    await fileSystem.makeDirectory(directory);
    return join(directory, fileName);
  }

  /**
   * 删除一个临时文件, 失败时只通知回调.
   * @param filePath 临时文件的完整路径.
   * @returns 删除之后兑现.
   */
  async remove(filePath: string): Promise<void> {
    try {
      await this.dependencies.fileSystem.removeFile(filePath);
    } catch (error) {
      this.dependencies.onFailure(error);
    }
  }

  /**
   * 删除专属目录与其中的全部内容, 应用启动与退出时用它清扫残留.
   */
  discardAll(): void {
    try {
      this.dependencies.fileSystem.removeDirectoryTreeSync(
        this.dependencies.directory,
      );
    } catch (error) {
      this.dependencies.onFailure(error);
    }
  }
}
