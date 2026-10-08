/**
 * IPv4 地址的四段数字.
 */
type Ipv4Octets = readonly [number, number, number, number];

/**
 * 回环主机名.
 */
const LOCALHOST_NAME = "localhost";

/**
 * 只会在本机或局域网里解析的主机名后缀: 回环名, 多播 DNS 名, 家庭网络名.
 */
const LOCAL_NAME_SUFFIXES: readonly string[] = [
  `.${LOCALHOST_NAME}`,
  ".local",
  ".home.arpa",
];

/**
 * 点分十进制 IPv4 地址的写法. `URL` 解析主机名时已把八进制, 十六进制和省略段的写法归一成这种形式.
 */
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * IPv4 地址每一段允许的最大值.
 */
const IPV4_OCTET_MAX = 255;

/**
 * 10.0.0.0/8 私有网段的第一段.
 */
const PRIVATE_10_FIRST_OCTET = 10;

/**
 * 127.0.0.0/8 回环网段的第一段.
 */
const LOOPBACK_FIRST_OCTET = 127;

/**
 * 172.16.0.0/12 私有网段的第一段.
 */
const PRIVATE_172_FIRST_OCTET = 172;

/**
 * 172.16.0.0/12 私有网段第二段的最小值.
 */
const PRIVATE_172_SECOND_OCTET_MIN = 16;

/**
 * 172.16.0.0/12 私有网段第二段的最大值.
 */
const PRIVATE_172_SECOND_OCTET_MAX = 31;

/**
 * 192.168.0.0/16 私有网段的第一段.
 */
const PRIVATE_192_FIRST_OCTET = 192;

/**
 * 192.168.0.0/16 私有网段的第二段.
 */
const PRIVATE_192_SECOND_OCTET = 168;

/**
 * 169.254.0.0/16 链路本地网段的第一段.
 */
const LINK_LOCAL_169_FIRST_OCTET = 169;

/**
 * 169.254.0.0/16 链路本地网段的第二段.
 */
const LINK_LOCAL_169_SECOND_OCTET = 254;

/**
 * IPv6 回环地址.
 */
const IPV6_LOOPBACK = "::1";

/**
 * 十六进制的基数, 用来读 IPv6 地址的第一组.
 */
const HEXADECIMAL_RADIX = 16;

/**
 * IPv6 唯一本地地址 fc00::/7 对第一组取前缀用的掩码.
 */
const IPV6_UNIQUE_LOCAL_MASK = 0xfe00;

/**
 * IPv6 唯一本地地址 fc00::/7 的第一组前缀.
 */
const IPV6_UNIQUE_LOCAL_PREFIX = 0xfc00;

/**
 * IPv6 链路本地地址 fe80::/10 对第一组取前缀用的掩码.
 */
const IPV6_LINK_LOCAL_MASK = 0xffc0;

/**
 * IPv6 链路本地地址 fe80::/10 的第一组前缀.
 */
const IPV6_LINK_LOCAL_PREFIX = 0xfe80;

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
  if (octets.some((octet) => octet > IPV4_OCTET_MAX)) {
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
    first === PRIVATE_10_FIRST_OCTET ||
    first === LOOPBACK_FIRST_OCTET ||
    (first === PRIVATE_172_FIRST_OCTET &&
      second >= PRIVATE_172_SECOND_OCTET_MIN &&
      second <= PRIVATE_172_SECOND_OCTET_MAX) ||
    (first === PRIVATE_192_FIRST_OCTET &&
      second === PRIVATE_192_SECOND_OCTET) ||
    (first === LINK_LOCAL_169_FIRST_OCTET &&
      second === LINK_LOCAL_169_SECOND_OCTET)
  );
}

/**
 * 判断 IPv6 地址是不是本机或局域网地址: `::1` 回环, fc00::/7 唯一本地地址, fe80::/10 链路本地.
 * @param address 去掉方括号的 IPv6 地址, 已由 `URL` 归一成小写压缩写法.
 * @returns 是本机或局域网地址时为 true.
 */
function isLocalIpv6(address: string): boolean {
  if (address === IPV6_LOOPBACK) {
    return true;
  }
  const firstGroup = Number.parseInt(address.split(":")[0], HEXADECIMAL_RADIX);
  if (Number.isNaN(firstGroup)) {
    return false;
  }
  return (
    (firstGroup & IPV6_UNIQUE_LOCAL_MASK) === IPV6_UNIQUE_LOCAL_PREFIX ||
    (firstGroup & IPV6_LINK_LOCAL_MASK) === IPV6_LINK_LOCAL_PREFIX
  );
}

/**
 * 判断主机名是不是只会在本机或局域网里解析的名字: `localhost`, 以 `.localhost`, `.local`,
 * `.home.arpa` 结尾的名字, 以及不带点的单段主机名 (例如 `nas`).
 * @param hostname 已去掉结尾点的主机名.
 * @returns 是本机或局域网名字时为 true.
 */
function isLocalName(hostname: string): boolean {
  return (
    hostname === LOCALHOST_NAME ||
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
