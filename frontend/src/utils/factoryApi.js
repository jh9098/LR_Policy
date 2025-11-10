// frontend/src/utils/factoryApi.js
// Render/Netlify 환경에서 FastAPI 백엔드와 통신하기 위한 래퍼 함수.

import { FACTORY_API_BASE_URL } from '../config.js';

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

async function requestFactoryApi(path, options = {}) {
  const baseUrl = FACTORY_API_BASE_URL || '';
  const url = `${baseUrl}${normalizePath(path)}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `Factory API 요청 실패 (${response.status})`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.detail === 'string') {
        message = errorBody.detail;
      } else if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      }
    } catch (error) {
      // 응답 본문이 JSON이 아닐 수 있으므로 무시
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export function searchFactoryVideos(payload) {
  return requestFactoryApi('/api/search_videos', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function extractFactoryCaptions(payload) {
  return requestFactoryApi('/api/extract_captions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getFactoryChannelStore() {
  return requestFactoryApi('/api/channel_store', { method: 'GET' });
}

export function addChannelsToFactoryStore(entries) {
  const payload = Array.isArray(entries) ? { channels: entries } : entries;
  return requestFactoryApi('/api/channel_store/add', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function removeChannelsFromFactoryStore(ids) {
  return requestFactoryApi('/api/channel_store/remove', {
    method: 'POST',
    body: JSON.stringify({ ids })
  });
}
