import { join } from "node:path";

import type { TemporaryCopyFileSystemPort } from "./attachment-file-port";

/**
 * 明文临时副本存储的依赖.
 */
export interface TemporaryCopyStoreDependencies {
  /**
   * 临时副本需要的文件系统能力.
   */
  readonly fileSystem: TemporaryCopyFileSystemPort;
  /**
   * 存放全部临时副本的专属目录, 在用户数据目录之下.
   */
  readonly baseDirectory: string;
  /**
   * 生成每次打开所用子目录名的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 删除失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 明文临时副本存储: 用系统默认程序打开附件时, 把解密后的内容写成只读文件放在专属目录里. 每次打开
 * 用随机命名的子目录, 保留原文件名让系统按扩展名选择程序. 副本只在这里创建, 应用启动时, 保险库
 * 锁定时与应用退出时整个专属目录一并删除; 删除失败 (例如文件被外部程序占用) 只通知回调, 留到
 * 下次锁定, 退出或启动时再清扫.
 */
export class TemporaryCopyStore {
  /**
   * 创建临时副本存储.
   * @param dependencies 存储依赖.
   */
  constructor(private readonly dependencies: TemporaryCopyStoreDependencies) {}

  /**
   * 把内容写成只读的临时副本.
   * @param name 副本的文件名, 保留附件的原文件名.
   * @param content 附件内容.
   * @returns 副本的完整路径.
   * @throws Error 当创建目录, 写文件或设为只读失败时.
   */
  async create(name: string, content: Buffer): Promise<string> {
    const { fileSystem, baseDirectory, createIdentifier } = this.dependencies;
    const directory = join(baseDirectory, createIdentifier());
    const filePath = join(directory, name);
    await fileSystem.makeDirectory(directory);
    await fileSystem.writeFile(filePath, content);
    await fileSystem.makeReadOnly(filePath);
    return filePath;
  }

  /**
   * 删除专属目录与其中的全部副本. 应用启动时用它清扫上次残留, 保险库锁定与应用退出时用它清除
   * 本次的副本.
   */
  discardAll(): void {
    try {
      this.dependencies.fileSystem.removeDirectoryTreeSync(
        this.dependencies.baseDirectory,
      );
    } catch (error) {
      this.dependencies.onFailure(error);
    }
  }
}
