/**
 * 测试用的 Bitwarden 导出里的一个文件夹.
 */
export const SAMPLE_FOLDER = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Demo/Work",
};

/**
 * 把条目列表写成 Bitwarden 个人库未加密导出的 JSON 文本.
 * @param items 条目对象列表.
 * @param folders 文件夹列表, 默认含一个示例文件夹.
 * @returns JSON 文本.
 */
export function bitwardenExport(
  items: readonly unknown[],
  folders: readonly unknown[] = [SAMPLE_FOLDER],
): string {
  return JSON.stringify({ encrypted: false, folders, items });
}

/**
 * 建一个 Bitwarden 登录条目, 带两个网址, TOTP, 两个自定义字段, 收藏与文件夹.
 * @param overrides 要覆盖的顶层字段.
 * @returns 条目对象.
 */
export function bitwardenLogin(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "00000000-0000-4000-8000-0000000000a1",
    organizationId: null,
    folderId: SAMPLE_FOLDER.id,
    type: 1,
    reprompt: 0,
    name: "Example Site",
    notes: "Fake login for import test",
    favorite: true,
    fields: [
      { name: "api_label", value: "demo-label", type: 0 },
      { name: "pin_hint", value: "0000", type: 1 },
    ],
    login: {
      uris: [
        { match: null, uri: "https://example.com/login" },
        { match: 1, uri: "https://example.org" },
      ],
      username: "demo.user@example.invalid",
      password: "FakePassw0rd!",
      totp: "otpauth://totp/Example:demo.user@example.invalid?secret=JBSWY3DPEHPK3PXP&issuer=Example",
    },
    collectionIds: null,
    ...overrides,
  };
}

/**
 * 建一个 Bitwarden 安全笔记条目.
 * @param overrides 要覆盖的顶层字段.
 * @returns 条目对象.
 */
export function bitwardenNote(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 2,
    name: "Example Note",
    notes: "Fake secure note.\nLine two.",
    favorite: false,
    secureNote: { type: 0 },
    ...overrides,
  };
}

/**
 * 建一个 Bitwarden 卡条目.
 * @param overrides 要覆盖的顶层字段.
 * @returns 条目对象.
 */
export function bitwardenCard(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 3,
    name: "Example Card",
    notes: null,
    favorite: false,
    card: {
      cardholderName: "Demo User",
      brand: "Visa",
      number: "4242424242424242",
      expMonth: "2",
      expYear: "2030",
      code: "000",
    },
    ...overrides,
  };
}

/**
 * 建一个 Bitwarden 身份条目.
 * @param overrides 要覆盖的顶层字段.
 * @returns 条目对象.
 */
export function bitwardenIdentity(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 4,
    name: "Example Identity",
    notes: null,
    favorite: false,
    identity: {
      title: "Mr",
      firstName: "Demo",
      middleName: null,
      lastName: "User",
      address1: "1 Example Street",
      address2: null,
      address3: null,
      city: "Exampleville",
      state: "EX",
      postalCode: "00000",
      country: "US",
      company: "Example Inc.",
      email: "demo@example.invalid",
      phone: "5555550100",
      ssn: "000-00-0000",
      username: "demo",
      passportNumber: "P1234567",
      licenseNumber: "L7654321",
    },
    ...overrides,
  };
}

/**
 * 建一个 Bitwarden SSH 密钥条目.
 * @param overrides 要覆盖的顶层字段.
 * @returns 条目对象.
 */
export function bitwardenSshKey(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 5,
    name: "Example SSH",
    notes: "ssh note",
    favorite: false,
    sshKey: {
      privateKey:
        "-----BEGIN FAKE PRIVATE KEY-----\nabc\n-----END FAKE PRIVATE KEY-----",
      publicKey: "ssh-ed25519 AAAAFAKE demo@example.invalid",
      keyFingerprint: "SHA256:fakefingerprint",
    },
    ...overrides,
  };
}
