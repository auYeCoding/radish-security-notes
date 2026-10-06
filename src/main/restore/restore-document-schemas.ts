import { z } from "zod";

import { CUSTOM_FIELD_KINDS } from "@shared/entries/custom-types/custom-field-kinds";
import { NOTES_FORMATS } from "@shared/entries/notes-format";
import {
  TOTP_ALGORITHMS,
  TOTP_DIGITS_OPTIONS,
} from "@shared/entries/totp-config";
import { TAG_COLOR_KEYS } from "@shared/tags/tag-colors";

import type {
  NativeAttachmentDocument,
  NativeCustomTypeDocument,
  NativeEntryDocument,
  NativeFolderDocument,
  NativeManifest,
  NativeTagDocument,
} from "../export/serializers/native/native-format-types";
import {
  NATIVE_FORMAT_ID,
  NATIVE_FORMAT_VERSION,
} from "../export/serializers/native/native-format-version";

/**
 * 非空文本的结构.
 */
const nonEmptyText = z.string().min(1);

/**
 * 非负整数的结构.
 */
const nonNegativeInteger = z.number().int().nonnegative();

/**
 * `manifest.json` 的结构, 与 `NativeManifest` 对应.
 */
export const manifestSchema: z.ZodType<NativeManifest> = z.object({
  format: z.literal(NATIVE_FORMAT_ID),
  version: z.literal(NATIVE_FORMAT_VERSION),
  createdAt: z.string(),
  scope: z.enum(["all", "selection"]),
  includesSecrets: z.boolean(),
  includesAttachments: z.boolean(),
  counts: z.object({
    entries: nonNegativeInteger,
    folders: nonNegativeInteger,
    tags: nonNegativeInteger,
    customEntryTypes: nonNegativeInteger,
    attachments: nonNegativeInteger,
  }),
});

/**
 * `vault.json` 里文件夹的结构, 与 `NativeFolderDocument` 对应.
 */
export const folderDocumentSchema: z.ZodType<NativeFolderDocument> = z.object({
  id: nonEmptyText,
  name: z.string(),
});

/**
 * `vault.json` 里标签的结构, 与 `NativeTagDocument` 对应.
 */
export const tagDocumentSchema: z.ZodType<NativeTagDocument> = z.object({
  id: nonEmptyText,
  name: z.string(),
  color: z.enum(TAG_COLOR_KEYS),
});

/**
 * `vault.json` 里自定义类型的结构, 与 `NativeCustomTypeDocument` 对应.
 */
export const customTypeDocumentSchema: z.ZodType<NativeCustomTypeDocument> =
  z.object({
    id: nonEmptyText,
    key: nonEmptyText,
    name: z.string(),
    fields: z.array(
      z.object({
        key: nonEmptyText,
        name: z.string(),
        kind: z.enum(CUSTOM_FIELD_KINDS),
        isSensitive: z.boolean(),
      }),
    ),
  });

/**
 * `vault.json` 里条目附件的结构, 与 `NativeAttachmentDocument` 对应.
 */
const attachmentDocumentSchema: z.ZodType<NativeAttachmentDocument> = z.object({
  id: nonEmptyText,
  name: z.string(),
  size: nonNegativeInteger,
  position: nonNegativeInteger,
  path: z.string(),
});

/**
 * `vault.json` 里条目的结构, 与 `NativeEntryDocument` 对应.
 */
export const entryDocumentSchema: z.ZodType<NativeEntryDocument> = z.object({
  id: nonEmptyText,
  type: nonEmptyText,
  name: z.string(),
  fields: z.record(z.string(), z.string()),
  notes: z.string(),
  notesFormat: z.enum(NOTES_FORMATS),
  customFields: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
      isHidden: z.boolean(),
    }),
  ),
  totp: z
    .object({
      secret: nonEmptyText,
      algorithm: z.enum(TOTP_ALGORITHMS),
      digits: z.literal(TOTP_DIGITS_OPTIONS),
      periodSeconds: nonNegativeInteger,
    })
    .nullable(),
  folderId: z.string().nullable(),
  tagIds: z.array(z.string()),
  createdAt: nonNegativeInteger,
  attachments: z.array(attachmentDocumentSchema),
});

/**
 * `vault.json` 顶层的结构: 四个区段都是数组, 区段里每一项由各自的结构单独校验, 这样能指出
 * 出问题的是第几项.
 */
export const vaultDocumentShapeSchema = z.object({
  folders: z.array(z.unknown()),
  tags: z.array(z.unknown()),
  customEntryTypes: z.array(z.unknown()),
  entries: z.array(z.unknown()),
});
