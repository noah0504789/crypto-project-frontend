import { useState } from 'react';
import type { User } from '@/types/user';
import {
  PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS,
  type PriceAlertMarket,
  type PriceAlertSetting,
  type PriceAlertSettingForm,
  type PriceAlertTargetChangeRatePercent,
} from '@/types/priceAlert';
import {
  convertFormToRequest,
  convertSettingsToForm,
} from '@/utils/priceAlertMapper';
import './PriceAlertsPage.css';

type PriceAlertsPageProps = {
  user: User | null;
};

const markets: PriceAlertMarket[] = [
  {
    code: 'KRW-BTC',
    koreanName: '비트코인',
    englishName: 'Bitcoin',
  },
  {
    code: 'KRW-ETH',
    koreanName: '이더리움',
    englishName: 'Ethereum',
  },
  {
    code: 'KRW-XRP',
    koreanName: '엑스알피',
    englishName: 'XRP',
  },
  {
    code: 'KRW-SOL',
    koreanName: '솔라나',
    englishName: 'Solana',
  },
  {
    code: 'KRW-DOGE',
    koreanName: '도지코인',
    englishName: 'Dogecoin',
  },
];

const mockSavedSettings: PriceAlertSetting[] = [
  {
    code: 'KRW-BTC',
    enabled: true,
    targetChangeRate: 0.03,
  },
  {
    code: 'KRW-ETH',
    enabled: true,
    targetChangeRate: 0.05,
  },
];

export default function PriceAlertsPage({ user }: PriceAlertsPageProps) {
  const [formSettings, setFormSettings] = useState<PriceAlertSettingForm[]>(
    convertSettingsToForm(markets, mockSavedSettings),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoggedIn = user !== null;

  function handleToggleEnabled(code: string) {
    setFormSettings((prevSettings) =>
      prevSettings.map((setting) =>
        setting.code === code
          ? {
              ...setting,
              enabled: !setting.enabled,
            }
          : setting,
      ),
    );
  }

  function handleChangeTargetRate(
    code: string,
    value: PriceAlertTargetChangeRatePercent,
  ) {
    setFormSettings((prevSettings) =>
      prevSettings.map((setting) =>
        setting.code === code
          ? {
              ...setting,
              targetChangeRatePercent: value,
            }
          : setting,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const enabledSettings = formSettings.filter((setting) => setting.enabled);

    if (enabledSettings.length === 0) {
      alert('알림을 설정할 가상화폐를 최소 1개 이상 선택해주세요.');
      return;
    }

    const requestBody = convertFormToRequest(formSettings);

    setIsSubmitting(true);

    try {
      console.log('save price alert settings:', requestBody);

      /**
       * 백엔드 컨트롤러 생기면 연결할 부분
       *
       * const response = await fetch('/price-alerts/me', {
       *   method: 'PUT',
       *   headers: {
       *     'Content-Type': 'application/json',
       *   },
       *   body: JSON.stringify(requestBody),
       * });
       *
       * if (!response.ok) {
       *   throw new Error('Failed to save price alert settings');
       * }
       */

      alert('가격 알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('submit failed:', error);
      alert('가격 알림 설정 저장 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="price-alerts-page">
        <div className="price-alerts-empty-card">
          <h1>가격 알림</h1>
          <p>가격 알림 설정은 로그인 후 사용할 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="price-alerts-page">
      <div className="price-alerts-header">
        <div>
          <h1>가격 알림 설정</h1>
          <p>
            관심 있는 가상화폐를 선택하고, 가격 변화율 기준을 선택해보세요.
          </p>
        </div>
      </div>

      <form className="price-alerts-form" onSubmit={handleSubmit}>
        <div className="price-alerts-list">
          {formSettings.map((setting) => (
            <article
              key={setting.code}
              className={`price-alert-card ${
                setting.enabled ? 'enabled' : ''
              }`}
            >
              <label className="price-alert-check-area">
                <input
                  type="checkbox"
                  checked={setting.enabled}
                  onChange={() => handleToggleEnabled(setting.code)}
                />

                <span className="price-alert-check-label">알림 받기</span>
              </label>

              <div className="price-alert-coin-info">
                <strong>{setting.koreanName}</strong>
                <span>{setting.code}</span>
              </div>

              <div className="price-alert-rate-field">
                <label htmlFor={`target-rate-${setting.code}`}>
                  변화율 기준
                </label>

                <div className="price-alert-select-wrapper">
                  <select
                    id={`target-rate-${setting.code}`}
                    value={setting.targetChangeRatePercent}
                    disabled={!setting.enabled}
                    onChange={(event) =>
                      handleChangeTargetRate(
                        setting.code,
                        event.target
                          .value as PriceAlertTargetChangeRatePercent,
                      )
                    }
                  >
                    {PRICE_ALERT_TARGET_CHANGE_RATE_PERCENT_OPTIONS.map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}%
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="price-alerts-submit-area">
          <p>
            예를 들어 <strong>3%</strong>로 설정하면 해당 코인의 가격 변화율이
            기준을 넘을 때 알림을 받을 수 있습니다.
          </p>

          <button
            type="submit"
            className="price-alerts-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '내 알람 설정하기'}
          </button>
        </div>
      </form>
    </section>
  );
}