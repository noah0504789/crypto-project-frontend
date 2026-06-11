import {
  PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS,
  type PriceAlertMarket,
  type PriceAlertSetting,
  type PriceAlertSettingForm,
  type PriceAlertTargetChangeRatePercent,
  type UpdateMyPriceAlertSettingsRequest,
} from '@/types/priceAlert';

const DEFAULT_TARGET_CHANGE_RATE_PERCENT =
  PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS[0];

function isPriceAlertTargetChangeRatePercent(
  value: string,
): value is PriceAlertTargetChangeRatePercent {
  return PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS.some(
    (option) => option === value,
  );
}

function convertRateToPercent(
  targetChangeRate: number,
): PriceAlertTargetChangeRatePercent {
  const percent = String(targetChangeRate * 100);

  if (isPriceAlertTargetChangeRatePercent(percent)) {
    return percent;
  }

  return DEFAULT_TARGET_CHANGE_RATE_PERCENT;
}

export function convertSettingsToForm(
  marketList: PriceAlertMarket[],
  savedSettings: PriceAlertSetting[],
): PriceAlertSettingForm[] {
  return marketList.map((market) => {
    const savedSetting = savedSettings.find(
      (setting) => setting.code === market.code,
    );

    return {
      code: market.code,
      koreanName: market.koreanName,
      enabled: savedSetting?.enabled ?? false,
      targetChangeRatePercent: savedSetting
        ? convertRateToPercent(savedSetting.targetChangeRate)
        : DEFAULT_TARGET_CHANGE_RATE_PERCENT,
    };
  });
}

export function convertFormToRequest(
  formSettings: PriceAlertSettingForm[],
): UpdateMyPriceAlertSettingsRequest {
  return {
    settings: formSettings.map((setting) => ({
      code: setting.code,
      enabled: setting.enabled,
      targetChangeRate: Number(setting.targetChangeRatePercent) / 100,
    })),
  };
}