/**
 * 读写保险库数据库的操作都可能遇到的失败原因: 数据库未解锁, 或操作意外抛出错误.
 */
export type DatabaseFailureReason = "vault-locked" | "unexpected-error";
