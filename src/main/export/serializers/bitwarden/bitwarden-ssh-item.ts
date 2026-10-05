import { PRIVATE_KEY_FIELD } from "@shared/entries/common-entry-fields";
import { SSH_PUBLIC_KEY_FIELD } from "@shared/entries/preset-types/ssh-key-type";

import { mapLoginItem } from "./bitwarden-login-item";
import type {
  BitwardenMappingInput,
  BitwardenTypedMapping,
} from "./bitwarden-mapping";
import { exportableSshKeyOf } from "./bitwarden-ssh-eligibility";
import { BITWARDEN_ITEM_TYPE } from "./bitwarden-types";

/**
 * 把 SSH 密钥映射成 Bitwarden SSH 密钥: 私钥, 公钥与由公钥算出的指纹对应写入; 主机, 端口, 账号与
 * 密钥口令没有对应的属性, 写成自定义字段. 缺私钥, 缺公钥或公钥无法解析时官方导入器会拒收整份文件,
 * 这样的条目按登录映射, 内容都以用户名与自定义字段带出.
 * @param input 映射输入.
 * @returns 映射结果.
 */
export function mapSshKeyItem(
  input: BitwardenMappingInput,
): BitwardenTypedMapping {
  const { entry } = input;
  const sshKey = exportableSshKeyOf(entry);
  if (sshKey === undefined) {
    return mapLoginItem(input);
  }
  return {
    type: BITWARDEN_ITEM_TYPE.sshKey,
    typed: { sshKey },
    consumedKeys: [PRIVATE_KEY_FIELD.key, SSH_PUBLIC_KEY_FIELD.key],
    notes: entry.notes,
  };
}
