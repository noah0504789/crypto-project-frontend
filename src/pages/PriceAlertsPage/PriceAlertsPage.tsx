import { type FormEvent, useEffect, useState } from 'react';
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
  convertFormToSavedSettings,
  convertSettingsToForm,
  createEmptyPriceAlertSettingForm,
} from '@/utils/priceAlertMapper';
import {
  getMarkets,
  getMyPriceAlertSettings,
  updateMyPriceAlertSettings,
} from '@/apis/priceAlertApi';
import './PriceAlertsPage.css';

type PriceAlertsPageProps = {
  user: User | null;
};

export default function PriceAlertsPage({ user }: PriceAlertsPageProps) {
  const isLoggedIn = user !== null;

  const [markets, setMarkets] = useState<PriceAlertMarket[]>([]);
  const [savedSettings, setSavedSettings] = useState<PriceAlertSetting[]>([]);
  const [formSettings, setFormSettings] = useState<PriceAlertSettingForm[]>([]);

  const [isLoading, setIsLoading] = useState(isLoggedIn);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [selectedMarketCodes, setSelectedMarketCodes] = useState<Set<string>>(
    new Set(),
  );

  // 마운트 시 마켓 목록 + 내 설정을 함께 조회해 폼을 구성한다.
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isCancelled = false;

    async function loadPriceAlerts() {
      try {
        const [marketList, settings] = await Promise.all([
          getMarkets(),
          getMyPriceAlertSettings(),
        ]);

        if (isCancelled) {
          return;
        }

        setMarkets(marketList);
        setSavedSettings(settings);
        setFormSettings(convertSettingsToForm(marketList, settings));
        setLoadError(false);
      } catch (error) {
        console.error('failed to load price alerts:', error);

        if (!isCancelled) {
          setMarkets([]);
          setSavedSettings([]);
          setFormSettings([]);
          setLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPriceAlerts();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, reloadKey]);

  const selectableMarkets = markets.filter(
    (market) => !formSettings.some((setting) => setting.code === market.code),
  );

  const currentRequestBody = convertFormToRequest(formSettings, savedSettings);

  const hasUnsavedChanges =
    currentRequestBody.creates.length > 0 ||
    currentRequestBody.updates.length > 0 ||
    currentRequestBody.deletes.length > 0;

  function handleOpenMarketModal() {
    setSelectedMarketCodes(new Set());
    setIsMarketModalOpen(true);
  }

  function handleCloseMarketModal() {
    setSelectedMarketCodes(new Set());
    setIsMarketModalOpen(false);
  }

  function handleToggleSelectedMarket(code: string) {
    setSelectedMarketCodes((prevCodes) => {
      const nextCodes = new Set(prevCodes);

      if (nextCodes.has(code)) {
        nextCodes.delete(code);
      } else {
        nextCodes.add(code);
      }

      return nextCodes;
    });
  }

  function handleResetSelectedMarkets() {
    setSelectedMarketCodes(new Set());
  }

  function handleAddSelectedMarkets() {
    if (selectedMarketCodes.size === 0) {
      return;
    }

    const selectedMarkets = selectableMarkets.filter((market) =>
      selectedMarketCodes.has(market.code),
    );

    if (selectedMarkets.length === 0) {
      return;
    }

    setFormSettings((prevSettings) => [
      ...prevSettings,
      ...selectedMarkets.map(createEmptyPriceAlertSettingForm),
    ]);

    setSelectedMarketCodes(new Set());
    setIsMarketModalOpen(false);
  }

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

  function handleToggleMarkedForDelete(code: string) {
    setFormSettings((prevSettings) =>
      prevSettings.map((setting) =>
        setting.code === code
          ? {
              ...setting,
              markedForDelete: !setting.markedForDelete,
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

  function handleResetToSavedSettings() {
    if (!hasUnsavedChanges) {
      return;
    }

    const confirmed = window.confirm(
      '저장하지 않은 변경사항을 처음 상태로 되돌릴까요?',
    );

    if (!confirmed) {
      return;
    }

    setFormSettings(convertSettingsToForm(markets, savedSettings));
    setSelectedMarketCodes(new Set());
    setIsMarketModalOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (formSettings.length === 0) {
      alert('가격 알림을 설정할 가상화폐를 추가해주세요.');
      return;
    }

    const requestBody = convertFormToRequest(formSettings, savedSettings);

    const hasChanges =
      requestBody.creates.length > 0 ||
      requestBody.updates.length > 0 ||
      requestBody.deletes.length > 0;

    if (!hasChanges) {
      alert('변경된 가격 알림 설정이 없습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateMyPriceAlertSettings(requestBody);

      // 저장 성공(204). 재조회 없이 폼을 저장본으로 로컬 동기화(낙관적 갱신 후 동기화 패턴).
      const nextSavedSettings = convertFormToSavedSettings(formSettings);

      setSavedSettings(nextSavedSettings);
      setFormSettings(convertSettingsToForm(markets, nextSavedSettings));
      setSelectedMarketCodes(new Set());
      setIsMarketModalOpen(false);

      alert('가격 알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('submit failed:', error);
      alert('가격 알림 설정 저장 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRetry() {
    setIsLoading(true);
    setLoadError(false);
    setReloadKey((prevKey) => prevKey + 1);
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

  if (isLoading) {
    return (
      <section className="price-alerts-page">
        <div className="price-alerts-empty-card">
          <p>가격 알림 설정을 불러오는 중입니다.</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="price-alerts-page">
        <div className="price-alerts-empty-card">
          <p>가격 알림 설정을 불러오지 못했습니다.</p>
          <button
            type="button"
            className="price-alert-add-button"
            onClick={handleRetry}
          >
            다시 시도
          </button>
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
            관심 있는 가상화폐를 추가하고, 가격 변화율 기준을 선택해보세요.
          </p>
        </div>

        <button
          type="button"
          className="price-alert-add-button"
          onClick={handleOpenMarketModal}
          disabled={selectableMarkets.length === 0}
        >
          알림 추가
        </button>
      </div>

      <form className="price-alerts-form" onSubmit={handleSubmit}>
        {formSettings.length === 0 ? (
          <div className="price-alerts-empty-card">
            <h2>등록된 가격 알림이 없습니다.</h2>
            <p>알림 추가 버튼을 눌러 관심 있는 가상화폐를 추가해주세요.</p>
          </div>
        ) : (
          <div className="price-alerts-list">
            {formSettings.map((setting) => (
              <article
                key={setting.code}
                className={`price-alert-card ${
                  setting.enabled ? 'enabled' : ''
                } ${setting.markedForDelete ? 'marked-for-delete' : ''}`}
              >
                <label className="price-alert-check-area">
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    disabled={setting.markedForDelete}
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
                      disabled={!setting.enabled || setting.markedForDelete}
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

                <label className="price-alert-delete-area">
                  <input
                    type="checkbox"
                    checked={setting.markedForDelete}
                    onChange={() => handleToggleMarkedForDelete(setting.code)}
                  />

                  <span className="price-alert-delete-label">삭제</span>
                </label>
              </article>
            ))}
          </div>
        )}

        <div className="price-alerts-submit-area">
          <p>
            예를 들어 <strong>3%</strong>로 설정하면 해당 코인의 가격 변화율이
            기준을 넘을 때 알림을 받을 수 있습니다.
          </p>

          <div className="price-alerts-submit-buttons">
            <button
              type="button"
              className="price-alerts-reset-button"
              onClick={handleResetToSavedSettings}
              disabled={isSubmitting || !hasUnsavedChanges}
            >
              처음상태
            </button>

            <button
              type="submit"
              className="price-alerts-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '내 알람 설정하기'}
            </button>
          </div>
        </div>
      </form>

      {isMarketModalOpen && (
        <div className="price-alert-modal-backdrop">
          <div className="price-alert-modal" role="dialog" aria-modal="true">
            <div className="price-alert-modal-header">
              <div>
                <h2>알림 추가</h2>
                <p>알림을 받을 가상화폐를 선택해주세요.</p>
              </div>

              <button
                type="button"
                className="price-alert-modal-close-button"
                onClick={handleCloseMarketModal}
              >
                닫기
              </button>
            </div>

            {selectableMarkets.length === 0 ? (
              <p className="price-alert-modal-empty">
                추가할 수 있는 가상화폐가 없습니다.
              </p>
            ) : (
              <>
                <div className="price-alert-market-list">
                  {selectableMarkets.map((market) => (
                    <label
                      key={market.code}
                      className={`price-alert-market-item ${
                        selectedMarketCodes.has(market.code) ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMarketCodes.has(market.code)}
                        onChange={() => handleToggleSelectedMarket(market.code)}
                      />

                      <span className="price-alert-market-item-text">
                        <strong>{market.koreanName}</strong>
                        <span>{market.code}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="price-alert-modal-actions">
                  <button
                    type="button"
                    className="price-alert-modal-reset-button"
                    onClick={handleResetSelectedMarkets}
                    disabled={selectedMarketCodes.size === 0}
                  >
                    초기화
                  </button>

                  <button
                    type="button"
                    className="price-alert-modal-add-button"
                    onClick={handleAddSelectedMarkets}
                    disabled={selectedMarketCodes.size === 0}
                  >
                    {selectedMarketCodes.size}개 추가
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}