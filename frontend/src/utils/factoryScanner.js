// frontend/src/utils/factoryScanner.js
// FastAPI 백엔드를 통해 활성 채널의 최신 영상을 수집하는 헬퍼.
// Firestore에 저장할 shape만 반환하고, 실제 저장은 firebaseClient의 upsertFactoryExplorerItems가 담당한다.

import { searchFactoryVideos } from './factoryApi.js';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIso(date) {
  const instance = toDate(date);
  if (!instance) return null;
  return new Date(instance.getTime() - 5 * 60 * 1000).toISOString();
}

function computePublishedAfter(channel, fallbackDate) {
  const lastSynced = toDate(channel.lastSyncedAt);
  const fallback = toDate(fallbackDate);
  const intervalMinutes = Number(channel.intervalMinutes ?? 0);
  const now = new Date();
  const defaultWindow = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  if (lastSynced) {
    return formatIso(lastSynced);
  }
  if (fallback) {
    return formatIso(fallback);
  }
  if (intervalMinutes > 0) {
    const intervalBased = new Date(now.getTime() - Math.max(intervalMinutes, 60) * 60 * 1000);
    return formatIso(intervalBased);
  }
  return defaultWindow.toISOString();
}

export async function scanFactoryChannels({ channels, fallbackPublishedAfter, maxResultsPerChannel = 5 }) {
  const validChannels = Array.isArray(channels)
    ? channels.filter((channel) => channel?.channelId).map((channel) => ({ ...channel }))
    : [];
  if (validChannels.length === 0) {
    return { discovered: [], errors: [] };
  }
  const discovered = [];
  const errors = [];
  for (const channel of validChannels) {
    try {
      const publishedAfter = computePublishedAfter(channel, fallbackPublishedAfter);
      const keywordBase = (channel.channelName || '').trim() || channel.channelId || 'latest';
      const searchPayload = {
        keywords: [keywordBase],
        limit: Math.max(1, Math.min(maxResultsPerChannel, 50)),
        sort_by: 'date',
        time_filter: publishedAfter ? 'custom' : 'any',
        custom_from_iso: publishedAfter || '',
        custom_to_iso: '',
        duration_filter: 'any',
        channel_ids: [channel.channelId],
        min_views: 0,
        len_min: null,
        len_max: null
      };

      const response = await searchFactoryVideos(searchPayload);
      const rawItems = Array.isArray(response?.[keywordBase])
        ? response[keywordBase]
        : response?.[channel.channelName] || response?.[channel.channelId] || [];

      const publishedAfterBoundary = publishedAfter ? new Date(publishedAfter) : null;
      rawItems
        .filter((item) => {
          if (!publishedAfterBoundary) return true;
          const publishedAt = toDate(item.published_at_iso);
          return !publishedAt || publishedAt > publishedAfterBoundary;
        })
        .forEach((item) => {
          const thumbnails = item.thumbnails || {};
          const publishedAt = toDate(item.published_at_iso) || new Date();
          let videoId = item.video_id || '';
          if (!videoId && typeof item.url === 'string') {
            try {
              videoId = new URL(item.url).searchParams.get('v') || '';
            } catch (error) {
              videoId = '';
            }
          }
          discovered.push({
            id: videoId || item.url,
            themeId: channel.themeId,
            themeLabel: channel.themeLabel,
            groupId: channel.groupId,
            groupName: channel.groupName,
            channelId: channel.channelId,
            channelName: item.channel_title || channel.channelName,
            videoId: videoId || item.url,
            videoTitle: item.title,
            thumbnail:
              thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '',
            publishedAt,
            durationSeconds: Number(item.dur_seconds || 0),
            language: item.language || '',
            hasCaptions: Boolean(item.has_captions),
            meta: {
              viewCount: typeof item.view_count === 'number' ? item.view_count : Number(item.view_count ?? 0) || 0,
              likeCount: null,
              favoriteCount: null,
              commentCount: null,
              scanChannelPriority: channel.priority || '중간'
            }
          });
        });
    } catch (error) {
      errors.push({
        channelId: channel.channelId,
        channelName: channel.channelName,
        message: error.message || '알 수 없는 오류'
      });
    }
  }
  return { discovered, errors };
}

