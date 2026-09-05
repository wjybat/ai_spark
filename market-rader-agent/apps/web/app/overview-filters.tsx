"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  REGION_CHANGE_EVENT,
  REGION_COOKIE,
  REGION_STORAGE_KEY,
  type RegionCode,
} from "@/lib/regions";
import { DropdownSelect, type DropdownOption } from "./ui/dropdown-select";
import { Icon, type IconName } from "./ui/icons";

interface FilterDefinition {
  readonly id: keyof FilterValues;
  readonly label: string;
  readonly icon: IconName;
  readonly options: readonly DropdownOption[];
}

interface FilterValues {
  region: string;
  format: string;
  product: string;
  customer: string;
  period: string;
}

const DEFAULTS: FilterValues = {
  region: "sea",
  format: "convenience",
  product: "ai-video",
  customer: "chain-500",
  period: "3y",
};

const FILTERS: readonly FilterDefinition[] = [
  {
    id: "region",
    label: "扫描区域",
    icon: "globe",
    options: [
      { value: "sea", label: "东南亚", description: "越南、印尼、泰国、马来西亚、菲律宾" },
      { value: "middle-east", label: "中东", description: "沙特、阿联酋、卡塔尔、科威特、阿曼" },
      { value: "latam", label: "拉美", description: "墨西哥、巴西、哥伦比亚、智利、秘鲁" },
      { value: "north-africa", label: "北非", description: "埃及、摩洛哥、阿尔及利亚、突尼斯、利比亚" },
    ],
  },
  {
    id: "format",
    label: "目标业态",
    icon: "store",
    options: [
      { value: "convenience", label: "便利店 / Mini Mart" },
      { value: "hypermarket", label: "大型商超 / Hypermarket" },
      { value: "pharmacy", label: "药妆店 / Pharmacy" },
      { value: "specialty", label: "专卖连锁" },
    ],
  },
  {
    id: "product",
    label: "我们的产品",
    icon: "chip",
    options: [
      { value: "ai-video", label: "AI视频分析 / 智慧门店" },
      { value: "rfid", label: "智能货架 / RFID" },
      { value: "crm", label: "会员营销 / CRM" },
    ],
  },
  {
    id: "customer",
    label: "目标客户",
    icon: "building",
    options: [
      { value: "chain-500", label: "连锁零售企业（≥500 店）" },
      { value: "direct", label: "品牌直营门店" },
      { value: "regional", label: "区域经销商" },
    ],
  },
  {
    id: "period",
    label: "数据时间",
    icon: "calendar",
    options: [
      { value: "1y", label: "最近 1 年" },
      { value: "3y", label: "最近 3 年" },
      { value: "5y", label: "最近 5 年" },
    ],
  },
];

function isFilterValues(value: unknown): value is Partial<FilterValues> {
  return typeof value === "object" && value !== null;
}

export function OverviewFilters({ initialRegion }: { initialRegion: RegionCode }): React.JSX.Element {
  const router = useRouter();
  const [values, setValues] = useState<FilterValues>({ ...DEFAULTS, region: initialRegion });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REGION_STORAGE_KEY);
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored);
        if (isFilterValues(parsed)) {
          setValues((current) => ({ ...current, ...parsed, region: initialRegion }));
        }
      }
    } catch {
      // 损坏的本地偏好不影响页面，回退服务端选中的区域。
    }
  }, [initialRegion]);

  function update(filter: FilterDefinition, value: string): void {
    const next = { ...values, [filter.id]: value };
    setValues(next);
    localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(next));
    const label = filter.options.find((option) => option.value === value)?.label ?? value;
    setNotice(`已选择「${filter.label}：${label}」`);
    window.setTimeout(() => setNotice(null), 2200);

    if (filter.id === "region") {
      document.cookie = `${REGION_COOKIE}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=31536000`;
      window.dispatchEvent(new CustomEvent(REGION_CHANGE_EVENT, { detail: { regionCode: value } }));
      router.refresh();
    }
  }

  return (
    <>
      <section className="filters" aria-label="市场筛选条件">
        {FILTERS.map((filter) => (
          <div className="filter" key={filter.id}>
            <div className="filter-label">{filter.label}</div>
            <DropdownSelect
              value={values[filter.id]}
              options={filter.options}
              onChange={(value) => update(filter, value)}
              leading={<Icon name={filter.icon} size={15} className="ic-muted" />}
              buttonClassName="filter-select"
              ariaLabel={filter.label}
            />
          </div>
        ))}
      </section>
      <div className="filter-context-note">
        <Icon name="info" size={12} /> 区域会决定本次扫描的五国 Scenario；切换后仅展示该区域最近完成的同 Provider 结果。
      </div>
      {notice !== null && <div className="selection-toast" role="status">{notice}</div>}
    </>
  );
}
