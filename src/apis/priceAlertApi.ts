import { apiClient } from '@/apis/apiClient';
import type {
  GetMyPriceAlertSettingsResponse,
  MarketResponse,
  UpdateMyPriceAlertSettingsRequest,
} from '@/types/priceAlert';
import { mapMarketResponseToPriceAlertMarket } from '@/utils/priceAlertMapper';

// 활성 마켓 목록(GET /markets). 백엔드 MarketResponse[] → 화면 모델 PriceAlertMarket[].
export async function getMarkets() {
  const response = await apiClient.get<MarketResponse[]>('/markets');

  return response.data.map(mapMarketResponseToPriceAlertMarket);
}

// 내 가격 알림 설정 조회(GET /price-alerts/me). targetChangeRate는 비율(0.03 = 3%).
export async function getMyPriceAlertSettings() {
  const response = await apiClient.get<GetMyPriceAlertSettingsResponse>(
    '/price-alerts/me',
  );

  return response.data?.settings ?? [];
}

// 내 가격 알림 설정 저장(PUT /price-alerts/me). 바디는 creates/updates/deletes diff. 성공 204.
export async function updateMyPriceAlertSettings(
  request: UpdateMyPriceAlertSettingsRequest,
) {
  await apiClient.put('/price-alerts/me', request);
}
