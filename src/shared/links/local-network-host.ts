/**
 * IPv4 地址的四段数字.
 */
type Ipv4Octets = readonly [number, number, number, number];

/**
 * 只会在本机或局域网里解析的主机名后缀: 回环名, 多播 DNS 名, 家庭网络名.
 */
const LOCAL_NAME_SUFFIXES: readonly string[] = [
  ".localhost",
  ".local",
  ".home.arpa",
];

/**
 * 点分十进制 IPv4 地址的写法. `URL` 解析主机名时已把八进制, 十六进制和省略段的写法归一成这种形式.
 */
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * 解析点分十进制 IPv4 地址.
 * @param hostname 主机名.
 * @returns 四段数字, 不是 IPv4 地址时为 undefined.
 */
function parseIpv4(hostname: string): Ipv4Octets | undefined {
  const match = IPV4_PATTERN.exec(hostname);
  if (match === null) {
    return undefined;
  }
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) {
    return undefined;
  }
  return [octets[0], octets[1], octets[2], octets[3]];
}

/**
 * 判断 IPv4 地址是不是本机或局域网地址: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
 * 回环与 169.254.0.0/16 链路本地.
 * @param octets IPv4 地址的四段数字.
 * @returns 是本机或局域网地址时为 true.
 */
function isLocalIpv4([first, second]: Ipv4Octets): boolean {
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

/**
 * 判断 IPv6 地址是不是本机或局域网地址: `::1` 回环, fc00::/7 唯一本地地址, fe80::/10 链路本地.
 * @param address 去掉方括号的 IPv6 地址, 已由 `URL` 归一成小写压缩写法.
 * @returns 是本机或局域网地址时为 true.
 */
function isLocalIpv6(address: string): boolean {
  if (address === "::1") {
    return true;
  }
  const firstGroup = Number.parseInt(address.split(":")[0], 16);
  if (Number.isNaN(firstGroup)) {
    return false;
  }
  return (firstGroup & 0xfe00) === 0xfc00 || (firstGroup & 0xffc0) === 0xfe80;
}

/**
 * 判断主机名是不是只会在本机或局域网里解析的名字: `localhost`, 以 `.localhost`, `.local`,
 * `.home.arpa` 结尾的名字, 以及不带点的单段主机名 (例如 `nas`).
 * @param hostname 已去掉结尾点的主机名.
 * @returns 是本机或局域网名字时为 true.
 */
function isLocalName(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    LOCAL_NAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
    (hostname.length > 0 && !hostname.includes("."))
  );
}

/**
 * 判断主机名是不是本机或局域网的地址. 只看主机名和地址的写法, 不做域名解析: 用域名解析到局域网
 * 的设备会被当成公网.
 * @param hostname `URL.hostname` 的值: 小写, IPv6 带方括号, IPv4 是点分十进制.
 * @returns 是本机或局域网的地址时为 true.
 */
export function isLocalNetworkHost(hostname: string): boolean {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return isLocalIpv6(hostname.slice(1, -1));
  }
  const withoutTrailingDot = hostname.endsWith(".")
    ? hostname.slice(0, -1)
    : hostname;
  const octets = parseIpv4(withoutTrailingDot);
  return octets === undefined
    ? isLocalName(withoutTrailingDot)
    : isLocalIpv4(octets);
}
