import { admitNewCustomEntryType } from "@shared/entries/custom-types/custom-entry-type-admission";
import {
  customEntryTypeSucceeded,
  type CustomEntryTypeResult,
} from "@shared/entries/custom-types/custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { toCustomEntryType } from "./custom-entry-type-mapper";
import { listCustomEntryTypes } from "./custom-entry-type-reader";
import { buildCustomEntryTypeRows } from "./custom-entry-type-record-builder";
import { insertCustomEntryType } from "./custom-entry-type-repository";

/**
 * 自定义类型服务的依赖.
 */
export interface CustomEntryTypeServiceDependencies extends DatabaseAccess {
  /**
   * 生成新类型与新字段的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
}

/**
 * 自定义类型服务: 在已解锁的加密数据库里新建与列出自定义条目类型. 类型名称与字段名只在方法
 * 执行期间经过内存, 不写入日志.
 */
export class CustomEntryTypeService {
  /**
   * 创建自定义类型服务.
   * @param dependencies 服务依赖.
   */
  constructor(
    private readonly dependencies: CustomEntryTypeServiceDependencies,
  ) {}

  /**
   * 读取全部自定义类型, 先创建的在前.
   * @returns 自定义类型列表, 未解锁时为失败结果.
   */
  list(): CustomEntryTypeResult<readonly CustomEntryType[]> {
    return this.withDatabase((orm) =>
      customEntryTypeSucceeded(listCustomEntryTypes(orm)),
    );
  }

  /**
   * 新建一个自定义类型: 按共享层的校验方案校验输入, 名称与字段名去首尾空格, 拒绝超过个数上限
   * 与重名, 生成类型与字段的编号和创建时间后, 类型行与全部字段行在同一个事务里写入.
   * @param input 用户填写的类型名称与字段.
   * @returns 新建的自定义类型, 未解锁, 输入不合规, 已达个数上限或重名时为失败结果.
   */
  create(
    input: NewCustomEntryTypeInput,
  ): CustomEntryTypeResult<CustomEntryType> {
    return this.withDatabase((orm) => {
      const existingNames = listCustomEntryTypes(orm).map((type) => type.name);
      const admitted = admitNewCustomEntryType(input, existingNames);
      if (!admitted.ok) {
        return admitted;
      }
      const rows = buildCustomEntryTypeRows({
        values: admitted.value,
        createIdentifier: this.dependencies.createIdentifier,
        createdAt: this.dependencies.now(),
      });
      insertCustomEntryType(orm, rows);
      return customEntryTypeSucceeded(toCustomEntryType(rows));
    });
  }

  /**
   * 在已解锁的数据库上执行一个操作, 未解锁与意外失败的处理见 `runWithDatabase`.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private withDatabase<Value>(
    operation: (orm: VaultOrm) => CustomEntryTypeResult<Value>,
  ): CustomEntryTypeResult<Value> {
    return runWithDatabase(this.dependencies, operation);
  }
}
