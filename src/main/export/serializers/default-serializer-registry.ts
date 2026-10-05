import { bitwardenJsonSerializer } from "./bitwarden/bitwarden-json-serializer";
import { browserCsvSerializer } from "./browser-csv/browser-csv-serializer";
import {
  createExportSerializerRegistry,
  type ExportSerializerRegistry,
} from "./export-serializer-registry";
import { nativeArchiveSerializer } from "./native/native-archive-serializer";

/**
 * 创建登记了全部导出格式序列化器的登记表. 新增格式时在这里加一行.
 * @returns 默认登记表.
 */
export function createDefaultExportSerializerRegistry(): ExportSerializerRegistry {
  return createExportSerializerRegistry([
    nativeArchiveSerializer,
    bitwardenJsonSerializer,
    browserCsvSerializer,
  ]);
}
