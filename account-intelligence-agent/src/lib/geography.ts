const continentCountries: Array<[string, string[]]> = [
  ["亚洲", ["中国", "中国香港", "香港", "中国澳门", "澳门", "中国台湾", "台湾", "日本", "韩国", "新加坡", "马来西亚", "泰国", "越南", "印度", "印度尼西亚", "菲律宾", "阿联酋", "沙特阿拉伯", "以色列"]],
  ["欧洲", ["英国", "法国", "德国", "意大利", "西班牙", "葡萄牙", "荷兰", "比利时", "瑞士", "奥地利", "瑞典", "挪威", "丹麦", "芬兰", "波兰", "爱尔兰", "捷克", "希腊"]],
  ["北美洲", ["美国", "加拿大", "墨西哥"]],
  ["南美洲", ["巴西", "阿根廷", "智利", "秘鲁", "哥伦比亚", "乌拉圭"]],
  ["大洋洲", ["澳大利亚", "新西兰"]],
  ["非洲", ["南非", "埃及", "尼日利亚", "肯尼亚", "摩洛哥"]],
];

export function continentForCountry(country: string | null | undefined): string {
  const normalized = country?.trim();
  if (!normalized) return "地区待补充";
  return continentCountries.find(([, countries]) => countries.some((candidate) => normalized === candidate || normalized.includes(candidate)))?.[0] || "其他地区";
}
