import { SearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@renderer/components/ui/input-group";
import { useEntrySearchTrigger } from "@renderer/stores/use-entry-search-trigger";
import { useEntryStore } from "@renderer/stores/use-entry-store";

/**
 * 顶部的搜索入口: 带搜索图标的输入框. 进入主界面时自动聚焦, 输入的关键字停顿片刻后在条目的名称,
 * 账号, 备注, 网址, 其它非保密类型字段, 自定义字段名与标签名里搜索, 列表只留下命中的条目.
 * @returns 搜索入口元素.
 */
export function SearchBar(): React.JSX.Element {
  const { t } = useTranslation();
  const query = useEntryStore((state) => state.query);
  const setQuery = useEntryStore((state) => state.setQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  useEntrySearchTrigger();
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <InputGroup className="flex-1">
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        type="search"
        aria-label={t("search.label")}
        placeholder={t("search.placeholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </InputGroup>
  );
}
