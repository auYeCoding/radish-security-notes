/**
 * 保险库的启动状态: 尚未设置, 等待主密码解锁, 已解锁, 或无法打开.
 */
export type VaultStatus = "needs-setup" | "locked" | "unlocked" | "failed";
