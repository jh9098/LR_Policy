// frontend/src/pages/admin/AdminFactoryPage.jsx
// Firestore 실데이터 연동을 염두에 둔 유튜브 스크립트 공정 대시보드
// 리뉴얼: 키워드 검색과 채널 수집 기능만 남기고 나머지 섹션은 주석 처리(비활성화)했다.

import { useEffect, useMemo, useState } from 'react';
import { THEME_CONFIG, getThemeById, getThemeLabel } from '../../constants/themeConfig.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getFactoryThemeConfigs, saveFactoryThemeConfig } from '../../firebaseClient.js';
import FactorySearchTools from '../../components/factory/FactorySearchTools.jsx';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const generateId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function createEmptyChannel({ id = '', name = '' } = {}) {
  return {
    id,
    name,
    priority: '중간',
    intervalMinutes: 720,
    active: true,
    lastSyncedAt: null,
    note: ''
  };
}

function normalizeChannelForEdit(channel = {}) {
  const base = createEmptyChannel({
    id: typeof channel.id === 'string' ? channel.id : '',
    name: typeof channel.name === 'string' ? channel.name : ''
  });
  return {
    ...base,
    priority: typeof channel.priority === 'string' ? channel.priority : base.priority,
    intervalMinutes: Number.isFinite(channel.intervalMinutes) ? channel.intervalMinutes : base.intervalMinutes,
    active: channel.active !== undefined ? Boolean(channel.active) : base.active,
    lastSyncedAt: channel.lastSyncedAt ?? base.lastSyncedAt,
    note: typeof channel.note === 'string' ? channel.note : base.note
  };
}

function createEmptyChild(name = '새 하위카테고리') {
  return {
    id: generateId('child'),
    name,
    description: '',
    channels: []
  };
}

function normalizeChildForEdit(child = {}) {
  return {
    id: typeof child.id === 'string' && child.id ? child.id : generateId('child'),
    name: typeof child.name === 'string' ? child.name : '',
    description: typeof child.description === 'string' ? child.description : '',
    channels: ensureArray(child.channels).map(normalizeChannelForEdit)
  };
}

function createEmptyGroup(name = '새 그룹') {
  return {
    id: generateId('group'),
    name,
    description: '',
    channels: [],
    children: []
  };
}

function normalizeGroupForEdit(group = {}) {
  return {
    id: typeof group.id === 'string' && group.id ? group.id : generateId('group'),
    name: typeof group.name === 'string' ? group.name : '',
    description: typeof group.description === 'string' ? group.description : '',
    channels: ensureArray(group.channels).map(normalizeChannelForEdit),
    children: ensureArray(group.children).map(normalizeChildForEdit)
  };
}

function createEmptyTheme(themeId) {
  return {
    themeId,
    groups: [],
    updatedAt: null,
    updatedBy: ''
  };
}

function cloneThemeData(theme, fallbackId = '') {
  const themeId = typeof theme?.themeId === 'string' && theme.themeId ? theme.themeId : fallbackId;
  return {
    themeId,
    groups: ensureArray(theme?.groups).map(normalizeGroupForEdit),
    updatedAt: theme?.updatedAt ?? null,
    updatedBy: typeof theme?.updatedBy === 'string' ? theme.updatedBy : ''
  };
}

const INITIAL_THEME_STATE = THEME_CONFIG.reduce((acc, theme) => {
  acc[theme.id] = createEmptyTheme(theme.id);
  return acc;
}, {});

function buildUserLabel(user) {
  if (!user) return '관리자';
  return user.email || user.displayName || user.uid || '관리자';
}

const formatDateTime = (value) => {
  if (!value) return '기록 없음';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '기록 없음';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return '기록 없음';
  }
};

function AdminFactoryPage() {
  const { user } = useAuth();
  const updatedBy = useMemo(() => buildUserLabel(user), [user]);

  const [themeConfigs, setThemeConfigs] = useState(() => ({ ...INITIAL_THEME_STATE }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirtyThemes, setDirtyThemes] = useState({});

  const [selectedThemeId, setSelectedThemeId] = useState(
    () => THEME_CONFIG[0]?.id ?? Object.keys(INITIAL_THEME_STATE)[0] ?? ''
  );
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [channelForm, setChannelForm] = useState({ name: '', id: '' });

  useEffect(() => {
    let mounted = true;

    async function loadThemeConfigs() {
      try {
        setLoading(true);
        setLoadError('');
        const data = await getFactoryThemeConfigs();
        if (!mounted) return;
        const merged = { ...INITIAL_THEME_STATE };
        Object.entries(data || {}).forEach(([themeId, theme]) => {
          merged[themeId] = cloneThemeData(theme, themeId);
        });
        setThemeConfigs(merged);
      } catch (error) {
        console.error('테마 구성 불러오기 실패:', error);
        if (mounted) {
          setLoadError('테마 구성을 불러오지 못했습니다. Firestore 연결을 확인하세요.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadThemeConfigs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const theme = themeConfigs[selectedThemeId];
    const groups = ensureArray(theme?.groups);
    if (groups.length === 0) {
      if (selectedGroupId || selectedChildId) {
        setSelectedGroupId('');
        setSelectedChildId('');
      }
      return;
    }

    const groupExists = groups.some((group) => group.id === selectedGroupId);
    if (!groupExists) {
      setSelectedGroupId(groups[0].id);
      setSelectedChildId('');
      return;
    }

    const currentGroup = groups.find((group) => group.id === selectedGroupId);
    if (!currentGroup) {
      setSelectedGroupId(groups[0].id);
      setSelectedChildId('');
      return;
    }

    if (!selectedChildId) {
      return;
    }

    const childExists = ensureArray(currentGroup.children).some((child) => child.id === selectedChildId);
    if (!childExists) {
      setSelectedChildId('');
    }
  }, [themeConfigs, selectedThemeId, selectedGroupId, selectedChildId]);

  useEffect(() => {
    setChannelForm({ name: '', id: '' });
  }, [selectedThemeId, selectedGroupId, selectedChildId]);

  const selectedThemeConfig = themeConfigs[selectedThemeId] ?? createEmptyTheme(selectedThemeId);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return ensureArray(selectedThemeConfig.groups).find((group) => group.id === selectedGroupId) || null;
  }, [selectedThemeConfig, selectedGroupId]);

  const selectedChild = useMemo(() => {
    if (!selectedGroup || !selectedChildId) return null;
    return ensureArray(selectedGroup.children).find((child) => child.id === selectedChildId) || null;
  }, [selectedGroup, selectedChildId]);

  const targetChannels = useMemo(() => {
    if (selectedChild) return ensureArray(selectedChild.channels);
    if (selectedGroup) return ensureArray(selectedGroup.channels);
    return [];
  }, [selectedGroup, selectedChild]);

  const existingChannelIds = useMemo(
    () => targetChannels.map((channel) => channel.id).filter(Boolean),
    [targetChannels]
  );

  const themeLabel = selectedThemeId ? getThemeLabel(selectedThemeId) : '테마 미선택';

  const targetLabel = useMemo(() => {
    if (!selectedGroup) return '';
    if (selectedChild) {
      return `${selectedGroup.name || '이름 없는 그룹'} › ${selectedChild.name || '하위 카테고리'}`;
    }
    return selectedGroup.name || '이름 없는 그룹';
  }, [selectedGroup, selectedChild]);

  const isDirty = Boolean(dirtyThemes[selectedThemeId]);

  const updateThemeConfigState = (themeId, mutateFn) => {
    setThemeConfigs((prev) => {
      const current = prev[themeId] ? cloneThemeData(prev[themeId], themeId) : createEmptyTheme(themeId);
      const mutated = mutateFn(current) || current;
      return { ...prev, [themeId]: mutated };
    });
    setDirtyThemes((prev) => ({ ...prev, [themeId]: true }));
  };

  const handleSelectTheme = (themeId) => {
    setSelectedThemeId(themeId);
    setSelectedGroupId('');
    setSelectedChildId('');
    setStatusMessage('');
    setSaveError('');
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedChildId('');
    setStatusMessage('');
    setSaveError('');
  };

  const handleSelectChild = (groupId, childId) => {
    setSelectedGroupId(groupId);
    setSelectedChildId(childId);
    setStatusMessage('');
    setSaveError('');
  };

  const handleAddGroup = () => {
    const newGroup = createEmptyGroup();
    updateThemeConfigState(selectedThemeId, (theme) => {
      theme.groups = [...ensureArray(theme.groups), newGroup];
      return theme;
    });
    setSelectedGroupId(newGroup.id);
    setSelectedChildId('');
    setStatusMessage('새 그룹을 추가했습니다. 그룹 이름을 수정하고 채널을 등록하세요.');
    setSaveError('');
  };

  const handleAddChild = (groupId) => {
    const groups = ensureArray(themeConfigs[selectedThemeId]?.groups);
    const group = groups.find((item) => item.id === groupId);
    if (!group) {
      setStatusMessage('선택한 그룹을 찾을 수 없습니다.');
      return;
    }
    const newChild = createEmptyChild();
    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const index = nextGroups.findIndex((item) => item.id === groupId);
      if (index === -1) return theme;
      const targetGroup = nextGroups[index];
      nextGroups[index] = {
        ...targetGroup,
        children: [...ensureArray(targetGroup.children), newChild]
      };
      theme.groups = nextGroups;
      return theme;
    });
    setSelectedGroupId(groupId);
    setSelectedChildId(newChild.id);
    setStatusMessage('새 하위 카테고리를 추가했습니다. 이름을 수정하고 채널을 등록하세요.');
    setSaveError('');
  };

  const handleDeleteGroup = (groupId) => {
    if (!window.confirm('선택한 그룹과 모든 채널을 삭제할까요?')) {
      return;
    }
    updateThemeConfigState(selectedThemeId, (theme) => {
      theme.groups = ensureArray(theme.groups).filter((group) => group.id !== groupId);
      return theme;
    });
    if (selectedGroupId === groupId) {
      setSelectedGroupId('');
      setSelectedChildId('');
    }
    setStatusMessage('그룹을 삭제했습니다. 저장을 눌러 Firestore에 반영하세요.');
    setSaveError('');
  };

  const handleDeleteChild = (groupId, childId) => {
    if (!window.confirm('선택한 하위 카테고리와 채널을 삭제할까요?')) {
      return;
    }
    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const index = nextGroups.findIndex((group) => group.id === groupId);
      if (index === -1) return theme;
      const targetGroup = nextGroups[index];
      nextGroups[index] = {
        ...targetGroup,
        children: ensureArray(targetGroup.children).filter((child) => child.id !== childId)
      };
      theme.groups = nextGroups;
      return theme;
    });
    if (selectedGroupId === groupId && selectedChildId === childId) {
      setSelectedChildId('');
    }
    setStatusMessage('하위 카테고리를 삭제했습니다. 저장을 눌러 Firestore에 반영하세요.');
    setSaveError('');
  };

  const handleGroupNameChange = (groupId, name) => {
    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const index = nextGroups.findIndex((group) => group.id === groupId);
      if (index === -1) return theme;
      const targetGroup = nextGroups[index];
      nextGroups[index] = { ...targetGroup, name };
      theme.groups = nextGroups;
      return theme;
    });
    setStatusMessage('그룹 이름을 수정했습니다. 저장을 눌러 Firestore에 반영하세요.');
    setSaveError('');
  };

  const handleChildNameChange = (groupId, childId, name) => {
    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const index = nextGroups.findIndex((group) => group.id === groupId);
      if (index === -1) return theme;
      const targetGroup = nextGroups[index];
      const children = ensureArray(targetGroup.children);
      const childIndex = children.findIndex((child) => child.id === childId);
      if (childIndex === -1) return theme;
      children[childIndex] = { ...children[childIndex], name };
      nextGroups[index] = { ...targetGroup, children };
      theme.groups = nextGroups;
      return theme;
    });
    setStatusMessage('하위 카테고리 이름을 수정했습니다. 저장을 눌러 Firestore에 반영하세요.');
    setSaveError('');
  };

  const addChannelToTarget = ({ id, name }) => {
    if (!selectedGroup) {
      throw new Error('먼저 채널을 추가할 그룹을 선택하세요.');
    }
    const trimmedId = (id || '').trim();
    if (!trimmedId) {
      throw new Error('채널 ID를 입력하세요.');
    }
    const channelName = (name || '').trim();
    const existingList = selectedChild ? ensureArray(selectedChild.channels) : ensureArray(selectedGroup.channels);
    if (existingList.some((channel) => channel.id === trimmedId)) {
      throw new Error('이미 이 위치에 존재하는 채널입니다.');
    }
    const locationLabel = selectedChild
      ? `${selectedGroup.name || '이름 없는 그룹'} › ${selectedChild.name || '하위 카테고리'}`
      : selectedGroup.name || '이름 없는 그룹';

    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const groupIndex = nextGroups.findIndex((group) => group.id === selectedGroup.id);
      if (groupIndex === -1) return theme;
      const targetGroup = nextGroups[groupIndex];
      const newChannel = createEmptyChannel({ id: trimmedId, name: channelName });

      if (selectedChild) {
        const children = ensureArray(targetGroup.children);
        const childIndex = children.findIndex((child) => child.id === selectedChild.id);
        if (childIndex === -1) return theme;
        const targetChild = children[childIndex];
        children[childIndex] = {
          ...targetChild,
          channels: [...ensureArray(targetChild.channels), newChannel]
        };
        nextGroups[groupIndex] = { ...targetGroup, children };
      } else {
        nextGroups[groupIndex] = {
          ...targetGroup,
          channels: [...ensureArray(targetGroup.channels), newChannel]
        };
      }

      theme.groups = nextGroups;
      return theme;
    });

    const displayName = channelName || trimmedId;
    const message = `${locationLabel}에 ${displayName} 채널을 추가했습니다. 저장을 눌러 Firestore에 반영하세요.`;
    setStatusMessage(message);
    setSaveError('');
    return { success: true, message };
  };

  const handleManualAdd = async (event) => {
    event.preventDefault();
    try {
      const result = addChannelToTarget(channelForm);
      if (result?.success) {
        setChannelForm({ name: '', id: '' });
      }
    } catch (error) {
      setStatusMessage(error.message || '채널을 추가하지 못했습니다.');
    }
  };

  const handleChannelFieldChange = (index, field, value) => {
    if (!selectedGroup) return;
    if (!['name', 'id'].includes(field)) return;
    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const groupIndex = nextGroups.findIndex((group) => group.id === selectedGroup.id);
      if (groupIndex === -1) return theme;
      const targetGroup = nextGroups[groupIndex];

      if (selectedChild) {
        const children = ensureArray(targetGroup.children);
        const childIndex = children.findIndex((child) => child.id === selectedChild.id);
        if (childIndex === -1) return theme;
        const targetChild = children[childIndex];
        const channels = ensureArray(targetChild.channels).map((channel, channelIndex) => {
          if (channelIndex !== index) return channel;
          return { ...channel, [field]: value };
        });
        children[childIndex] = { ...targetChild, channels };
        nextGroups[groupIndex] = { ...targetGroup, children };
      } else {
        const channels = ensureArray(targetGroup.channels).map((channel, channelIndex) => {
          if (channelIndex !== index) return channel;
          return { ...channel, [field]: value };
        });
        nextGroups[groupIndex] = { ...targetGroup, channels };
      }

      theme.groups = nextGroups;
      return theme;
    });
    setStatusMessage('채널 정보를 수정했습니다. 저장을 눌러 Firestore에 반영하세요.');
    setSaveError('');
  };

  const handleRemoveChannel = (index) => {
    if (!selectedGroup) return;
    const removed = targetChannels[index];
    updateThemeConfigState(selectedThemeId, (theme) => {
      const nextGroups = ensureArray(theme.groups);
      const groupIndex = nextGroups.findIndex((group) => group.id === selectedGroup.id);
      if (groupIndex === -1) return theme;
      const targetGroup = nextGroups[groupIndex];

      if (selectedChild) {
        const children = ensureArray(targetGroup.children);
        const childIndex = children.findIndex((child) => child.id === selectedChild.id);
        if (childIndex === -1) return theme;
        const targetChild = children[childIndex];
        const channels = ensureArray(targetChild.channels).filter((_, channelIndex) => channelIndex !== index);
        children[childIndex] = { ...targetChild, channels };
        nextGroups[groupIndex] = { ...targetGroup, children };
      } else {
        const channels = ensureArray(targetGroup.channels).filter((_, channelIndex) => channelIndex !== index);
        nextGroups[groupIndex] = { ...targetGroup, channels };
      }

      theme.groups = nextGroups;
      return theme;
    });
    const removedLabel = removed?.name || removed?.id || '채널';
    setStatusMessage(`${removedLabel} 채널을 삭제했습니다. 저장을 눌러 Firestore에 반영하세요.`);
    setSaveError('');
  };

  const handleSaveTheme = async () => {
    try {
      setSaving(true);
      setSaveError('');
      const themeConfig = themeConfigs[selectedThemeId] ?? createEmptyTheme(selectedThemeId);
      const payload = cloneThemeData(themeConfig, selectedThemeId);
      const saved = await saveFactoryThemeConfig(selectedThemeId, payload, { updatedBy });
      setThemeConfigs((prev) => ({ ...prev, [selectedThemeId]: cloneThemeData(saved, selectedThemeId) }));
      setDirtyThemes((prev) => {
        const next = { ...prev };
        delete next[selectedThemeId];
        return next;
      });
      setStatusMessage('저장되었습니다.');
    } catch (error) {
      console.error('테마 구성 저장 실패:', error);
      setSaveError(error.message || '테마 구성을 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDefaultGroups = () => {
    const themeMeta = getThemeById(selectedThemeId);
    const keyAreas = ensureArray(themeMeta?.keyAreas);
    if (keyAreas.length === 0) {
      setStatusMessage('이 테마에는 미리 정의된 카테고리가 없습니다. 필요에 맞게 직접 추가하세요.');
      return;
    }
    const groups = keyAreas.map((area) => createEmptyGroup(area));
    updateThemeConfigState(selectedThemeId, (theme) => ({ ...theme, groups }));
    setSelectedGroupId(groups[0]?.id ?? '');
    setSelectedChildId('');
    setStatusMessage('테마 기본 카테고리를 불러왔습니다. 저장을 눌러 Firestore에 반영하세요.');
    setSaveError('');
  };

  const groups = ensureArray(selectedThemeConfig.groups);
  const updatedAtLabel = formatDateTime(selectedThemeConfig.updatedAt);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">YouTube 채널 수집 공정</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          키워드 검색으로 채널을 발굴하고 테마/하위 카테고리별로 채널명·채널 ID를 관리합니다. 기존 대시보드·큐·로그·템플릿
          섹션은 리뉴얼 요구에 따라 주석 처리하여 화면에서 숨겼습니다.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {THEME_CONFIG.map((theme) => {
          const isActive = selectedThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelectTheme(theme.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {theme.label}
            </button>
          );
        })}
      </nav>

      {loadError && (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/80 dark:bg-rose-500/10 dark:text-rose-200">
          {loadError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">테마 구조 관리</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              그룹과 하위 카테고리를 먼저 구성한 뒤 채널을 연결하세요. 저장을 누르기 전까지는 Firestore에 반영되지 않습니다.
            </p>
          </header>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleLoadDefaultGroups}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-500"
            >
              테마 기본 카테고리 불러오기
            </button>
            <button
              type="button"
              onClick={handleAddGroup}
              className="w-full rounded-md border border-indigo-500 px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            >
              새 그룹 추가
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                테마 구성을 불러오는 중입니다...
              </p>
            ) : groups.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                아직 등록된 그룹이 없습니다. "새 그룹 추가" 버튼을 눌러 채널을 분류할 그룹을 만들어 주세요.
              </p>
            ) : (
              groups.map((group) => {
                const groupSelected = selectedGroupId === group.id && !selectedChildId;
                const childSelected = selectedGroupId === group.id && Boolean(selectedChildId);
                return (
                  <div
                    key={group.id}
                    className={`rounded-lg border ${
                      groupSelected || childSelected
                        ? 'border-indigo-500 ring-1 ring-indigo-400'
                        : 'border-slate-200 dark:border-slate-700'
                    } bg-white dark:bg-slate-900`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectGroup(group.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-t-lg bg-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span>{group.name || '이름 없는 그룹'}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {ensureArray(group.channels).length + ensureArray(group.children).reduce((acc, child) => acc + ensureArray(child.channels).length, 0)}개 채널
                      </span>
                    </button>
                    <div className="space-y-2 border-t border-slate-200 p-3 text-sm dark:border-slate-700">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        그룹 이름
                        <input
                          value={group.name}
                          onChange={(event) => handleGroupNameChange(group.id, event.target.value)}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddChild(group.id)}
                          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400"
                        >
                          하위 카테고리 추가
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="rounded-md border border-rose-400 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/70 dark:text-rose-200 dark:hover:bg-rose-500/10"
                        >
                          그룹 삭제
                        </button>
                      </div>

                      {ensureArray(group.children).length > 0 && (
                        <div className="space-y-2">
                          {ensureArray(group.children).map((child) => {
                            const isChildSelected = selectedGroupId === group.id && selectedChildId === child.id;
                            return (
                              <div
                                key={child.id}
                                className={`rounded-md border ${
                                  isChildSelected
                                    ? 'border-indigo-500 ring-1 ring-indigo-400'
                                    : 'border-slate-200 dark:border-slate-700'
                                } bg-slate-50 p-3 dark:bg-slate-800`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectChild(group.id, child.id)}
                                  className="mb-2 flex w-full items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-indigo-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <span>{child.name || '하위 카테고리'}</span>
                                  <span className="text-[11px] text-slate-400">{ensureArray(child.channels).length}개 채널</span>
                                </button>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  하위 카테고리 이름
                                  <input
                                    value={child.name}
                                    onChange={(event) => handleChildNameChange(group.id, child.id, event.target.value)}
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChild(group.id, child.id)}
                                  className="mt-2 w-full rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/60 dark:text-rose-200 dark:hover:bg-rose-500/10"
                                >
                                  하위 카테고리 삭제
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">마지막 저장: {updatedAtLabel}</p>
        </section>

        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">채널 관리</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                현재 선택된 테마: <span className="font-semibold text-indigo-600 dark:text-indigo-300">{themeLabel}</span>{' '}
                {targetLabel && `› ${targetLabel}`}
              </p>
              {statusMessage && (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/80 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {statusMessage}
                </p>
              )}
              {saveError && (
                <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/80 dark:bg-rose-500/10 dark:text-rose-200">
                  {saveError}
                </p>
              )}
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {targetLabel ? `채널 저장 위치: ${targetLabel}` : '채널을 저장할 그룹 또는 하위 카테고리를 선택하세요.'}
              </div>
              <button
                type="button"
                onClick={handleSaveTheme}
                disabled={saving || !isDirty}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  saving
                    ? 'border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    : isDirty
                    ? 'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {saving ? '저장 중...' : isDirty ? '변경 사항 저장' : '저장 완료'}
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="grid gap-3 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto]">
              <input
                value={channelForm.name}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="채널명"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <input
                value={channelForm.id}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="채널 ID (UC로 시작)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!selectedGroup}
              >
                채널 수동 추가
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2">채널명</th>
                    <th className="px-3 py-2">채널 ID</th>
                    <th className="px-3 py-2 text-right">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {targetChannels.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-300">
                        아직 채널이 없습니다. 키워드 검색 결과에서 "추가"를 누르거나 위 입력란에서 직접 등록하세요.
                      </td>
                    </tr>
                  ) : (
                    targetChannels.map((channel, index) => (
                      <tr key={`${channel.id || 'channel'}-${index}`} className="bg-white dark:bg-slate-900">
                        <td className="px-3 py-2">
                          <input
                            value={channel.name}
                            onChange={(event) => handleChannelFieldChange(index, 'name', event.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={channel.id}
                            onChange={(event) => handleChannelFieldChange(index, 'id', event.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveChannel(index)}
                            className="rounded-md border border-rose-400 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/70 dark:text-rose-200 dark:hover:bg-rose-500/10"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <FactorySearchTools
            onChannelPick={addChannelToTarget}
            existingChannelIds={existingChannelIds}
            targetLabel={targetLabel}
            className="lg:col-span-1"
          />
        </div>
      </div>
    </div>
  );
}

export default AdminFactoryPage;
