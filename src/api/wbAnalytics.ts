// ─── WB Analytics frontend client ─────────────────────────────────────────
// Тонкий клиент поверх /api/analytics/wb/sales-funnel. Использует общий
// request() из client.ts, поэтому автоматически подставляет API_BASE и токен.

import { request } from './client';

export interface WbArticleMetrics {
  nmId: number;
  vendorCode: string;
  selected: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
  past: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
  dynamics: {
    openCount: number; // уже в %, как отдаёт WB
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
}

export interface WbSalesFunnelResponse {
  currency: string;
  articles: WbArticleMetrics[];
  cached: boolean;
  updating?: boolean;
}

export interface WbTimeSeriesPoint {
  date: string;
  metrics: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
}

export interface WbTimeSeriesResponse {
  points: WbTimeSeriesPoint[] | null;
  cached: boolean;
  updating?: boolean;
}

export async function fetchWbTimeSeries(
  entity: string | undefined,
  nmIds: number[],
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' = 'day'
): Promise<WbTimeSeriesResponse> {
  return request<WbTimeSeriesResponse>('/api/analytics/wb/timeseries', {
    method: 'POST',
    body: JSON.stringify({ entity, nmIds, startDate, endDate, groupBy }),
  });
}

export async function fetchWbSalesFunnel(
  nmIds: number[],
  startDate: string,
  endDate: string
): Promise<WbSalesFunnelResponse> {
  return request<WbSalesFunnelResponse>('/api/analytics/wb/sales-funnel', {
    method: 'POST',
    body: JSON.stringify({ nmIds, startDate, endDate }),
  });
}
