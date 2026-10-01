import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@renderer/components/ui/input-group";

/**
 * 顶部的搜索入口: 带搜索图标的输入框. 现在只有外观, 输入不触发任何搜索.
 * @returns 搜索入口元素.
 */
export function SearchBar(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <InputGroup className="flex-1">
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={t("search.label")}
        placeholder={t("search.placeholder")}
      />
    </InputGroup>
  );
}
