import {
  PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS,
  type MarketResponse,
  type PriceAlertMarket,
  type PriceAlertSetting,
  type PriceAlertSettingForm,
  type PriceAlertTargetChangeRatePercent,
  type UpdateMyPriceAlertSettingsRequest,
} from '@/types/priceAlert';

export function mapMarketResponseToPriceAlertMarket(
  response: MarketResponse,
): PriceAlertMarket {
  return {
    code: response.marketCode,
    koreanName: response.koreanName,
    englishName: response.englishName,
  };
}

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
  const percent = String(Math.round(targetChangeRate * 100));

  if (isPriceAlertTargetChangeRatePercent(percent)) {
    return percent;
  }

  return DEFAULT_TARGET_CHANGE_RATE_PERCENT;
}

function convertPercentToRate(
  targetChangeRatePercent: PriceAlertTargetChangeRatePercent,
): number {
  return Number(targetChangeRatePercent) / 100;
}

function hasSameSetting(
  savedSetting: PriceAlertSetting,
  formSetting: PriceAlertSettingForm,
): boolean {
  return (
    savedSetting.enabled === formSetting.enabled &&
    savedSetting.targetChangeRate ===
      convertPercentToRate(formSetting.targetChangeRatePercent)
  );
}

export function convertSettingsToForm(
  marketList: PriceAlertMarket[],
  savedSettings: PriceAlertSetting[],
): PriceAlertSettingForm[] {
  const marketMap = new Map(marketList.map((market) => [market.code, market]));

  return savedSettings
    .map((setting) => {
      const market = marketMap.get(setting.code);

      if (!market) {
        return null;
      }

      return {
        code: setting.code,
        koreanName: market.koreanName,
        enabled: setting.enabled,
        markedForDelete: false,
        targetChangeRatePercent: convertRateToPercent(
          setting.targetChangeRate,
        ),
      };
    })
    .filter((setting): setting is PriceAlertSettingForm => setting !== null);
}

export function createEmptyPriceAlertSettingForm(
  market: PriceAlertMarket,
): PriceAlertSettingForm {
  return {
    code: market.code,
    koreanName: market.koreanName,
    enabled: true,
    markedForDelete: false,
    targetChangeRatePercent: DEFAULT_TARGET_CHANGE_RATE_PERCENT,
  };
}

export function convertFormToRequest(
  formSettings: PriceAlertSettingForm[],
  savedSettings: PriceAlertSetting[],
): UpdateMyPriceAlertSettingsRequest {
  const savedSettingMap = new Map(
    savedSettings.map((setting) => [setting.code, setting]),
  );

  const creates: UpdateMyPriceAlertSettingsRequest['creates'] = [];
  const updates: UpdateMyPriceAlertSettingsRequest['updates'] = [];
  const deletes: UpdateMyPriceAlertSettingsRequest['deletes'] = [];

  for (const formSetting of formSettings) {
    const savedSetting = savedSettingMap.get(formSetting.code);

    if (formSetting.markedForDelete) {
      if (savedSetting) {
        deletes.push({
          code: formSetting.code,
        });
      }

      continue;
    }

    if (!savedSetting) {
      creates.push({
        code: formSetting.code,
        enabled: formSetting.enabled,
        targetChangeRate: convertPercentToRate(
          formSetting.targetChangeRatePercent,
        ),
      });

      continue;
    }

    if (!hasSameSetting(savedSetting, formSetting)) {
      updates.push({
        code: formSetting.code,
        enabled: formSetting.enabled,
        targetChangeRate: convertPercentToRate(
          formSetting.targetChangeRatePercent,
        ),
      });
    }
  }

  return {
    creates,
    updates,
    deletes,
  };
}

export function convertFormToSavedSettings(
  formSettings: PriceAlertSettingForm[],
): PriceAlertSetting[] {
  return formSettings
    .filter((setting) => !setting.markedForDelete)
    .map((setting) => ({
      code: setting.code,
      enabled: setting.enabled,
      targetChangeRate: convertPercentToRate(setting.targetChangeRatePercent),
    }));
}