import { isLocalNetworkHost } from "./local-network-host";

/**
 * 可能交给系统打开的外部链接协议, 带结尾冒号, 与 `URL.protocol` 的写法一致. 这是协议范围的唯一
 * 定义: 渲染端用它决定链接能不能点, 主进程用它决定链接能不能打开. 其中只限局域网的协议还要再过
 * 主机名这一关.
 */
export const ALLOWED_EXTERNAL_LINK_PROTOCOLS: readonly string[] = [
  "http:",
  "https:",
  "mailto:",
];

/**
 * 只对本机与局域网地址放行的协议: 明文的 `http:` 不能交给公网地址, 但局域网设备的管理页 (例如
 * 路由器) 多是 http 地址, 所以对局域网放行.
 */
export const LOCAL_NETWORK_ONLY_PROTOCOLS: readonly string[] = ["http:"];

/**
 * 判断一个地址是不是允许打开的外部链接: 必须是能解析的绝对地址, 协议在允许范围内, 只限局域网的
 * 协议还要求主机是本机或局域网地址. 相对路径, 锚点, `javascript:`, `file:`, `data:`, 自定义协议
 * 与公网的 `http:` 地址都不允许.
 * @param url 待判断的地址.
 * @returns 允许打开时为 true.
 */
export function isAllowedExternalLink(url: string): boolean {
  if (!URL.canParse(url)) {
    return false;
  }
  const { protocol, hostname } = new URL(url);
  if (!ALLOWED_EXTERNAL_LINK_PROTOCOLS.includes(protocol)) {
    return false;
  }
  return (
    !LOCAL_NETWORK_ONLY_PROTOCOLS.includes(protocol) ||
    isLocalNetworkHost(hostname)
  );
}
