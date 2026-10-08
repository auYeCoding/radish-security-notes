/**
 * 记录型假服务: 任何方法被调用都只记下方法名并返回 undefined, 用来证明处理函数有没有触达服务.
 */
export interface RecordingService<ServiceType extends object> {
  /**
   * 假服务本身, 可当作真服务传给注册函数.
   */
  readonly service: ServiceType;
  /**
   * 按调用顺序记下的服务方法名.
   */
  readonly calls: string[];
}

/**
 * 创建记录型假服务.
 * @returns 假服务与它记下的调用.
 */
export function createRecordingService<
  ServiceType extends object,
>(): RecordingService<ServiceType> {
  const calls: string[] = [];
  const service = new Proxy({} as ServiceType, {
    get: (_target, property) => () => {
      calls.push(String(property));
    },
  });
  return { service, calls };
}
