/**
 * 单飞互斥标志: 同一时间只允许一个持有者. 保险库的设置, 解锁, 恢复, 切换主密码, 查看恢复密钥与
 * 锁定共用同一个实例, 彼此不并发.
 */
export interface OperationExclusion {
  /**
   * 尝试占用.
   * @returns 占用成功为 true, 已被占用为 false.
   */
  readonly tryAcquire: () => boolean;
  /**
   * 释放占用.
   */
  readonly release: () => void;
}

/**
 * 创建单飞互斥标志, 初始未被占用.
 * @returns 互斥标志.
 */
export function createOperationExclusion(): OperationExclusion {
  let isHeld = false;
  return {
    tryAcquire: () => {
      if (isHeld) {
        return false;
      }
      isHeld = true;
      return true;
    },
    release: () => {
      isHeld = false;
    },
  };
}
