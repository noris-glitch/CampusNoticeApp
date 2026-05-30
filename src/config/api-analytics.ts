import { isAxiosError } from 'axios';
import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';

import { API_PATHS, apiUrl } from './api-core';
import type { StoredUser } from './api-types';

export interface AnalyticsReportRequest {
  analyticsRange?: 'daily' | 'monthly' | 'weekly';
  dateFrom?: string | null;
  dateTo?: string | null;
}

export function analyticsReportUrl(user: StoredUser, request: AnalyticsReportRequest = {}): string {
  const params = new URLSearchParams({
    token: user.token,
    user_id: String(user.user_id),
  });

  if (request.analyticsRange) {
    params.set('analytics_range', request.analyticsRange);
  }

  if (request.dateFrom) {
    params.set('date_from', request.dateFrom);
  }

  if (request.dateTo) {
    params.set('date_to', request.dateTo);
  }

  return `${apiUrl(API_PATHS.analyticsReport)}?${params.toString()}`;
}

export async function downloadAnalyticsReportPdf(
  user: StoredUser,
  request: AnalyticsReportRequest = {}
): Promise<File> {
  const url = analyticsReportUrl(user, request);
  const reportDir = new Directory(Paths.cache, 'campusnotice-reports');
  reportDir.create({ idempotent: true, intermediates: true });

  const fileName = `analytics-report-${Date.now()}.pdf`;
  const reportFile = new File(reportDir, fileName);
  if (reportFile.exists) {
    reportFile.delete();
  }

  try {
    return await File.downloadFileAsync(url, reportFile);
  } catch (error) {
    const fallback = 'Could not generate the analytics report.';

    try {
      const response = await expoFetch(url);
      if (!response.ok) {
        const text = await response.text();
        if (text.trim() !== '') {
          const parsed = JSON.parse(text) as { error?: string };
          throw new Error(parsed.error || text);
        }
      }
    } catch {
      // Ignore parsing errors and fall through to the fallback message below.
    }

    throw new Error(getApiErrorMessage(error, fallback));
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (
      responseData &&
      typeof responseData === 'object' &&
      'error' in responseData &&
      typeof responseData.error === 'string'
    ) {
      return responseData.error;
    }

    if (typeof responseData === 'string' && responseData.trim() !== '') {
      const text = responseData.trim();
      if (/<!doctype html>|<html/i.test(text)) {
        if (status === 502 || status === 503 || status === 504) {
          return 'The server is waking up or temporarily unavailable. Please wait a few seconds and try again.';
        }
        if (status === 500) {
          return 'The server hit an internal error. Please retry in a few seconds.';
        }
        return fallback;
      }
      return text;
    }

    if (status === 500) {
      return 'The server hit an internal error. Please retry in a few seconds.';
    }
    if (status === 502 || status === 503 || status === 504) {
      return 'The server is waking up or temporarily unavailable. Please wait a few seconds and try again.';
    }

    if (error.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again in a few seconds.';
    }

    if (error.message === 'Network Error') {
      return 'Could not reach the server. If Render was asleep, wait a few seconds and try again.';
    }

    if (typeof error.message === 'string' && error.message.trim() !== '') {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim() !== '') {
    if (/network request failed/i.test(error.message)) {
      return 'The upload could not reach the server. Re-select the file, confirm your connection, and try a smaller MP4 if the video is very large.';
    }

    return error.message;
  }

  return fallback;
}
