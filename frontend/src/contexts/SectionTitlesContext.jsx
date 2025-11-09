// frontend/src/contexts/SectionTitlesContext.jsx
// 상세 페이지 섹션 제목을 전역으로 제공하는 컨텍스트. 앱 로딩 시 Firestore에서 값을 가져온다.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { getSectionTitles } from '../firebaseClient.js';
import { mergeSectionTitles } from '../constants/sectionTitleConfig.js';

const SectionTitlesContext = createContext({
  titles: mergeSectionTitles(),
  meta: { updatedAt: null, updatedBy: '' },
  loading: true,
  error: '',
  refresh: async () => {}
});

export function SectionTitlesProvider({ children }) {
  const [titles, setTitles] = useState(() => mergeSectionTitles());
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSectionTitles();
      setTitles(mergeSectionTitles(data?.titles));
      setMeta({ updatedAt: data?.updatedAt ?? null, updatedBy: data?.updatedBy ?? '' });
      setError('');
    } catch (err) {
      console.error('섹션 제목 불러오기 실패:', err);
      setError('섹션 제목을 불러오지 못했습니다. 기본값이 사용됩니다.');
      setTitles((prev) => mergeSectionTitles(prev));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      titles,
      meta,
      loading,
      error,
      refresh
    }),
    [titles, meta, loading, error, refresh]
  );

  return <SectionTitlesContext.Provider value={value}>{children}</SectionTitlesContext.Provider>;
}

SectionTitlesProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useSectionTitles() {
  return useContext(SectionTitlesContext);
}
