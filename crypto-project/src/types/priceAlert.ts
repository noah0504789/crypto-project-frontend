export const PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS = [
  '3',
  '5',
  '7',
] as const;

export type PriceAlertTargetChangeRatePercent =
  (typeof PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS)[number];

export type PriceAlertMarket = {
  code: string;
  koreanName: string;
  englishName: string;
};

export type PriceAlertSetting = {
  code: string;
  enabled: boolean;

  /**
   * 백엔드 기준 변화율
   * 예: 0.03 = 3%
   */
  targetChangeRate: number;
};

export type PriceAlertSettingForm = {
  code: string;
  koreanName: string;
  enabled: boolean;

  /**
   * 화면 선택용 퍼센트 값
   * 예: "3" = 3%
   */
  targetChangeRatePercent: PriceAlertTargetChangeRatePercent;
};

export type GetMyPriceAlertSettingsResponse = {
  settings: PriceAlertSetting[];
};

export type UpdateMyPriceAlertSettingsRequest = {
  settings: PriceAlertSetting[];
};