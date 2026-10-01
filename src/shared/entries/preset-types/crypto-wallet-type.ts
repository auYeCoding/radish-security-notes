import { PRIVATE_KEY_FIELD } from "../common-entry-fields";
import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 加密钱包类型: 钱包地址, 区块链网络, 恢复短语, 钱包密码, 私钥, 其中恢复短语, 钱包密码与
 * 私钥敏感, 恢复短语与私钥是多行.
 */
export const CRYPTO_WALLET_TYPE = defineEntryType("cryptoWallet", [
  defineField("walletAddress"),
  defineField("blockchainNetwork"),
  defineField("recoveryPhrase", { isSensitive: true, isMultiline: true }),
  defineField("walletPassword", { isSensitive: true }),
  PRIVATE_KEY_FIELD,
]);
