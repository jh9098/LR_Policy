// frontend/src/utils/factoryScanner.js
// YouTube Data API를 호출해 활성 채널의 최신 영상을 수집하는 헬퍼.
// Firestore에 저장할 shape만 반환하고, 실제 저장은 firebaseClient의 upsertFactoryExplorerItems가 담당한다.

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function parseIsoDurationToSeconds(isoDuration) {
  if (typeof isoDuration !== 'string' || !isoDuration.startsWith('PT')) {
    return 0;
  }
  const pattern = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = isoDuration.match(pattern);
  if (!match) {
    return 0;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    let message = `YouTube API 요청 실패 (${response.status})`;
    try {
      const errorBody = await response.json();
      message = errorBody?.error?.message || message;
    } catch (error) {
      // noop
    }
    throw new Error(message);
  }
  return response.json();
}

async function fetchChannelVideos({ apiKey, channelId, publishedAfter, maxResults }) {
  const params = new URLSearchParams({
    key: apiKey,
    channelId,
    part: 'snippet',
    order: 'date',
    type: 'video',
    maxResults: String(Math.max(1, Math.min(maxResults, 50)))
  });
  if (publishedAfter) {
    params.set('publishedAfter', publishedAfter);
  }
  const searchData = await fetchJson(`${YOUTUBE_API_BASE}/search?${params.toString()}`);
  const videoIds = (searchData.items || [])
    .filter((item) => item.id?.videoId)
    .map((item) => item.id.videoId);
  if (videoIds.length === 0) {
    return [];
  }
  const detailParams = new URLSearchParams({
    key: apiKey,
    id: videoIds.join(','),
    part: 'snippet,contentDetails,statistics'
  });
  const detailData = await fetchJson(`${YOUTUBE_API_BASE}/videos?${detailParams.toString()}`);
  return (detailData.items || []).map((item) => {
    const snippet = item.snippet || {};
    const contentDetails = item.contentDetails || {};
    const statistics = item.statistics || {};
    const publishedAt = toDate(snippet.publishedAt);
    return {
      id: item.id,
      videoId: item.id,
      title: snippet.title || '',
      channelTitle: snippet.channelTitle || '',
      thumbnails: snippet.thumbnails || {},
      publishedAt,
      durationSeconds: parseIsoDurationToSeconds(contentDetails.duration),
      language: snippet.defaultAudioLanguage || snippet.defaultLanguage || '',
      hasCaptions: contentDetails.caption === 'true',
      statistics: {
        viewCount: Number(statistics.viewCount ?? 0),
        likeCount: Number(statistics.likeCount ?? 0),
        favoriteCount: Number(statistics.favoriteCount ?? 0),
        commentCount: Number(statistics.commentCount ?? 0)
      }
    };
  });
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

export async function scanFactoryChannels({ apiKey, channels, fallbackPublishedAfter, maxResultsPerChannel = 5 }) {
  if (!apiKey) {
    throw new Error('YouTube API 키가 설정되지 않았습니다. VITE_YOUTUBE_API_KEY 환경 변수를 확인하세요.');
  }
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
      const items = await fetchChannelVideos({
        apiKey,
        channelId: channel.channelId,
        publishedAfter,
        maxResults: maxResultsPerChannel
      });
      items
        .filter((item) => !item.publishedAt || !publishedAfter || item.publishedAt > new Date(publishedAfter))
        .forEach((item) => {
          discovered.push({
            id: item.videoId,
            themeId: channel.themeId,
            themeLabel: channel.themeLabel,
            groupId: channel.groupId,
            groupName: channel.groupName,
            channelId: channel.channelId,
            channelName: item.channelTitle || channel.channelName,
            videoId: item.videoId,
            videoTitle: item.title,
            thumbnail:
              item.thumbnails?.high?.url || item.thumbnails?.medium?.url || item.thumbnails?.default?.url || '',
            publishedAt: item.publishedAt || new Date(),
            durationSeconds: item.durationSeconds,
            language: item.language,
            hasCaptions: item.hasCaptions,
            meta: {
              ...item.statistics,
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

