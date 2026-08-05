export const PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS = [
  '0',
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

/**
 * GET /markets 응답 아이템(백엔드 MarketResponse).
 * 화면 모델 PriceAlertMarket의 code는 이 marketCode에서 온다.
 */
export type MarketResponse = {
  id: number;
  marketCode: string;
  symbol: string;
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
   * 저장 시 삭제할 설정인지 여부
   * true면 PUT 요청의 deletes에 포함됨
   */
  markedForDelete: boolean;

  /**
   * 화면 선택용 퍼센트 값
   * 예: "0" = 0%, "3" = 3%
   */
  targetChangeRatePercent: PriceAlertTargetChangeRatePercent;
};

/**
 * GET /price-alerts/me
 */
export type GetMyPriceAlertSettingsResponse = {
  settings: PriceAlertSetting[];
};

/**
 * PUT /price-alerts/me
 */
export type CreatePriceAlertSettingRequest = {
  code: string;
  enabled: boolean;
  targetChangeRate: number;
};

export type UpdatePriceAlertSettingRequest = {
  code: string;
  enabled: boolean;
  targetChangeRate: number;
};

export type DeletePriceAlertSettingRequest = {
  code: string;
};

export type UpdateMyPriceAlertSettingsRequest = {
  creates: CreatePriceAlertSettingRequest[];
  updates: UpdatePriceAlertSettingRequest[];
  deletes: DeletePriceAlertSettingRequest[];
};
