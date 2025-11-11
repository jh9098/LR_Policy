import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SIGNUP_FIELD_TYPES,
  SIGNUP_MODES,
  buildFieldMap,
  createDefaultSignupFormConfig,
  getFieldLabel,
  normalizeSignupFormConfig
} from '../../constants/signupFormConfig.js';
import { getSignupFormSettings, saveSignupFormSettings } from '../../firebaseClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSignupFormSettings } from '../../contexts/SignupFormSettingsContext.jsx';

const MODE_LABELS = {
  login: '로그인',
  register: '회원가입'
};

const SECTION_STYLE_OPTIONS = [
  { value: 'default', label: '기본 레이아웃' },
  { value: 'card', label: '강조 박스' }
];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createNewField() {
  const timestamp = Date.now();
  return {
    id: `custom-${timestamp}`,
    label: '새 입력 항목',
    type: 'text',
    placeholder: '',
    helpText: '',
    enabledModes: ['register'],
    requiredModes: [],
    defaultValue: ''
  };
}

function createNewSection() {
  const timestamp = Date.now();
  return {
    id: `section-${timestamp}`,
    title: '새 섹션',
    description: '',
    style: 'default',
    fieldIds: []
  };
}

function parseOptionsText(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return [];
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, label] = line.split('|');
      if (label === undefined) {
        return { value: line, label: line };
      }
      return { value: value.trim(), label: label.trim() };
    });
}

function formatOptionsText(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return '';
  }
  return options
    .map((option) => {
      const value = typeof option.value === 'string' ? option.value : '';
      const label = typeof option.label === 'string' ? option.label : '';
      return `${value}|${label}`;
    })
    .join('\n');
}

function moveItem(array, index, direction) {
  const next = [...array];
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= array.length) {
    return next;
  }
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function validateConfig(config) {
  const fieldMap = buildFieldMap(config.fields);
  const { emailFieldId, passwordFieldId, confirmEmailFieldId, confirmPasswordFieldId } = config.identity;

  if (!emailFieldId || !fieldMap[emailFieldId]) {
    return '이메일 항목이 올바르게 설정되지 않았습니다.';
  }
  if (!passwordFieldId || !fieldMap[passwordFieldId]) {
    return '비밀번호 항목이 올바르게 설정되지 않았습니다.';
  }
  if (confirmEmailFieldId && !fieldMap[confirmEmailFieldId]) {
    return '이메일 재확인 항목이 삭제되었거나 비활성화되었습니다. 다시 선택해주세요.';
  }
  if (confirmPasswordFieldId && !fieldMap[confirmPasswordFieldId]) {
    return '비밀번호 재확인 항목이 삭제되었거나 비활성화되었습니다. 다시 선택해주세요.';
  }

  if (!config.loginLayout.includes(emailFieldId) || !config.loginLayout.includes(passwordFieldId)) {
    return '로그인 화면에는 이메일과 비밀번호 항목이 반드시 포함되어야 합니다.';
  }

  const registerFieldIds = new Set();
  config.registerLayout.forEach((section) => {
    section.fieldIds.forEach((fieldId) => registerFieldIds.add(fieldId));
  });

  if (!registerFieldIds.has(emailFieldId) || !registerFieldIds.has(passwordFieldId)) {
    return '회원가입 화면에는 이메일과 비밀번호 항목이 반드시 포함되어야 합니다.';
  }

  return '';
}

export default function SignupFormSettingsEditor() {
  const { user } = useAuth();
  const { refresh: refreshGlobalConfig } = useSignupFormSettings();
  const [configState, setConfigState] = useState(() => createDefaultSignupFormConfig());
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fieldMap = useMemo(() => buildFieldMap(configState.fields), [configState.fields]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSignupFormSettings();
      setConfigState(normalizeSignupFormConfig(data?.config ?? {}));
      setMeta({ updatedAt: toDate(data?.updatedAt) ?? null, updatedBy: data?.updatedBy ?? '' });
      setError('');
    } catch (err) {
      console.error('회원가입 폼 설정 불러오기 실패:', err);
      setError('회원가입 폼 설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleFieldChange = (fieldId, key, value) => {
    if (key === 'id') {
      const nextId = typeof value === 'string' ? value.trim() : '';
      if (!nextId) {
        setError('필드 ID는 비워둘 수 없습니다.');
        return;
      }
      setConfigState((prev) => {
        if (prev.fields.some((field) => field.id === nextId && field.id !== fieldId)) {
          setError('이미 사용 중인 필드 ID입니다. 다른 값으로 입력해주세요.');
          return prev;
        }
        setError('');
        const updatedFields = prev.fields.map((field) => (field.id === fieldId ? { ...field, id: nextId } : field));
        const updatedLoginLayout = prev.loginLayout.map((id) => (id === fieldId ? nextId : id));
        const updatedRegisterLayout = prev.registerLayout.map((section) => ({
          ...section,
          fieldIds: section.fieldIds.map((id) => (id === fieldId ? nextId : id))
        }));
        const updatedIdentity = Object.fromEntries(
          Object.entries(prev.identity || {}).map(([identityKey, currentValue]) => [
            identityKey,
            currentValue === fieldId ? nextId : currentValue
          ])
        );
        return {
          ...prev,
          fields: updatedFields,
          loginLayout: updatedLoginLayout,
          registerLayout: updatedRegisterLayout,
          identity: updatedIdentity
        };
      });
      return;
    }

    setConfigState((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.id === fieldId ? { ...field, [key]: value } : field))
    }));
  };

  const toggleFieldMode = (fieldId, mode, key) => {
    setConfigState((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => {
        if (field.id !== fieldId) return field;
        const current = new Set(field[key] || []);
        if (current.has(mode)) {
          current.delete(mode);
        } else {
          current.add(mode);
        }
        return { ...field, [key]: Array.from(current) };
      })
    }));
  };

  const handleFieldOptionsChange = (fieldId, text) => {
    const options = parseOptionsText(text);
    handleFieldChange(fieldId, 'options', options);
  };

  const handleRemoveField = (fieldId) => {
    setConfigState((prev) => {
      const filteredFields = prev.fields.filter((field) => field.id !== fieldId);
      const cleanedLoginLayout = prev.loginLayout.filter((id) => id !== fieldId);
      const cleanedRegisterLayout = prev.registerLayout.map((section) => ({
        ...section,
        fieldIds: section.fieldIds.filter((id) => id !== fieldId)
      }));
      const newIdentity = { ...prev.identity };
      Object.keys(newIdentity).forEach((key) => {
        if (newIdentity[key] === fieldId) {
          newIdentity[key] = '';
        }
      });
      return {
        ...prev,
        fields: filteredFields,
        loginLayout: cleanedLoginLayout,
        registerLayout: cleanedRegisterLayout,
        identity: newIdentity
      };
    });
  };

  const handleAddField = () => {
    setConfigState((prev) => ({
      ...prev,
      fields: [...prev.fields, createNewField()]
    }));
  };

  const handleAddSection = () => {
    setConfigState((prev) => ({
      ...prev,
      registerLayout: [...prev.registerLayout, createNewSection()]
    }));
  };

  const handleRemoveSection = (sectionId) => {
    setConfigState((prev) => {
      const remaining = prev.registerLayout.filter((section) => section.id !== sectionId);
      return {
        ...prev,
        registerLayout: remaining.length > 0 ? remaining : [createNewSection()]
      };
    });
  };

  const moveLoginField = (index, direction) => {
    setConfigState((prev) => ({
      ...prev,
      loginLayout: moveItem(prev.loginLayout, index, direction)
    }));
  };

  const handleRemoveLoginField = (fieldId) => {
    setConfigState((prev) => ({
      ...prev,
      loginLayout: prev.loginLayout.filter((id) => id !== fieldId)
    }));
  };

  const handleAddFieldToLogin = (fieldId) => {
    if (!fieldId) return;
    setConfigState((prev) => {
      const exists = prev.loginLayout.includes(fieldId);
      const nextFields = prev.fields.map((item) => {
        if (item.id !== fieldId) return item;
        if (!item.enabledModes.includes('login')) {
          return { ...item, enabledModes: [...item.enabledModes, 'login'] };
        }
        return item;
      });
      return {
        ...prev,
        fields: nextFields,
        loginLayout: exists ? prev.loginLayout : [...prev.loginLayout, fieldId]
      };
    });
  };

  const moveSection = (index, direction) => {
    setConfigState((prev) => ({
      ...prev,
      registerLayout: moveItem(prev.registerLayout, index, direction)
    }));
  };

  const handleSectionFieldChange = (sectionId, updater) => {
    setConfigState((prev) => ({
      ...prev,
      registerLayout: prev.registerLayout.map((section) => {
        if (section.id !== sectionId) return section;
        return updater(section);
      })
    }));
  };

  const handleAddFieldToSection = (sectionId, fieldId) => {
    if (!fieldId) return;
    setConfigState((prev) => {
      const nextFields = prev.fields.map((item) => {
        if (item.id !== fieldId) return item;
        if (!item.enabledModes.includes('register')) {
          return { ...item, enabledModes: [...item.enabledModes, 'register'] };
        }
        return item;
      });
      return {
        ...prev,
        fields: nextFields,
        registerLayout: prev.registerLayout.map((section) => {
          if (section.id !== sectionId) return section;
          if (section.fieldIds.includes(fieldId)) return section;
          return { ...section, fieldIds: [...section.fieldIds, fieldId] };
        })
      };
    });
  };

  const handleRemoveFieldFromSection = (sectionId, fieldId) => {
    handleSectionFieldChange(sectionId, (section) => ({
      ...section,
      fieldIds: section.fieldIds.filter((id) => id !== fieldId)
    }));
  };

  const moveFieldWithinSection = (sectionId, index, direction) => {
    handleSectionFieldChange(sectionId, (section) => ({
      ...section,
      fieldIds: moveItem(section.fieldIds, index, direction)
    }));
  };

  const handleIdentityChange = (key, value) => {
    setConfigState((prev) => ({
      ...prev,
      identity: { ...prev.identity, [key]: value }
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const normalized = normalizeSignupFormConfig(configState);
      const validationError = validateConfig(normalized);
      if (validationError) {
        setError(validationError);
        setSaving(false);
        return;
      }
      const updatedBy = user?.email || user?.displayName || user?.uid || '관리자';
      await saveSignupFormSettings(normalized, { updatedBy });
      setMessage('회원가입 폼 설정을 저장했습니다.');
      setMeta({ updatedAt: new Date(), updatedBy });
      await refreshGlobalConfig();
    } catch (err) {
      console.error('회원가입 폼 설정 저장 실패:', err);
      setError('회원가입 폼 설정을 저장하지 못했습니다. 입력값을 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="space-y-1">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">회원가입 입력 항목 설정</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          회원가입 화면에 표시할 입력 항목, 필수 여부, 섹션 구성을 자유롭게 조정할 수 있습니다.
        </p>
        {meta.updatedAt && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            최근 저장:{' '}
            {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(meta.updatedAt)}
            {meta.updatedBy ? ` (${meta.updatedBy})` : ''}
          </p>
        )}
        {loading && <p className="text-[11px] text-slate-400">설정을 불러오는 중입니다...</p>}
      </header>

      <form className="space-y-6" onSubmit={handleSave}>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">입력 항목 목록</h4>
            <button
              type="button"
              onClick={handleAddField}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/60"
              disabled={loading || saving}
            >
              항목 추가
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            각 항목은 로그인·회원가입 화면에서 개별적으로 노출/필수 여부를 설정할 수 있습니다. 선택형 항목은 "값|라벨" 형식으로 줄바꿈하여 옵션을 입력하세요.
          </p>

          <div className="space-y-3">
            {configState.fields.map((field) => (
              <details
                key={field.id}
                className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                open
              >
                <summary className="flex cursor-pointer items-center justify-between bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                  <span>
                    {getFieldLabel(field)} <span className="text-xs font-normal text-slate-400">({field.id})</span>
                  </span>
                  <span className="text-xs text-slate-400">{field.type}</span>
                </summary>
                <div className="space-y-3 bg-white px-3 py-3 text-xs dark:bg-slate-800">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">표시 이름</span>
                      <input
                        type="text"
                        value={field.label || ''}
                        onChange={(event) => handleFieldChange(field.id, 'label', event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">필드 ID</span>
                      <input
                        type="text"
                        value={field.id}
                        onChange={(event) => handleFieldChange(field.id, 'id', event.target.value.trim())}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">입력 타입</span>
                      <select
                        value={field.type}
                        onChange={(event) => handleFieldChange(field.id, 'type', event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      >
                        {SIGNUP_FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">플레이스홀더</span>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(event) => handleFieldChange(field.id, 'placeholder', event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">도움말 문구</span>
                    <textarea
                      value={field.helpText || ''}
                      onChange={(event) => handleFieldChange(field.id, 'helpText', event.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      rows={2}
                      disabled={saving}
                    />
                  </label>

                  {field.type === 'select' && (
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">선택 옵션 (값|라벨)</span>
                      <textarea
                        value={formatOptionsText(field.options)}
                        onChange={(event) => handleFieldOptionsChange(field.id, event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        rows={4}
                        placeholder="예)\n|선택 안 함\nfemale|여성\nmale|남성"
                        disabled={saving}
                      />
                    </label>
                  )}

                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">최소 글자수</span>
                      <input
                        type="number"
                        value={field.minLength ?? ''}
                        onChange={(event) =>
                          handleFieldChange(field.id, 'minLength', event.target.value === '' ? undefined : Number(event.target.value))
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">최대 글자수</span>
                      <input
                        type="number"
                        value={field.maxLength ?? ''}
                        onChange={(event) =>
                          handleFieldChange(field.id, 'maxLength', event.target.value === '' ? undefined : Number(event.target.value))
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">숫자 최소/최대값</span>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          value={field.min ?? ''}
                          onChange={(event) =>
                            handleFieldChange(field.id, 'min', event.target.value === '' ? undefined : Number(event.target.value))
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          disabled={saving}
                        />
                        <input
                          type="number"
                          value={field.max ?? ''}
                          onChange={(event) =>
                            handleFieldChange(field.id, 'max', event.target.value === '' ? undefined : Number(event.target.value))
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          disabled={saving}
                        />
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">정규식 패턴</span>
                      <input
                        type="text"
                        value={field.pattern || ''}
                        onChange={(event) => handleFieldChange(field.id, 'pattern', event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">검증 실패 메시지</span>
                      <input
                        type="text"
                        value={field.validationMessage || ''}
                        onChange={(event) => handleFieldChange(field.id, 'validationMessage', event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">일치 확인 대상</span>
                    <select
                      value={field.matchField || ''}
                      onChange={(event) => handleFieldChange(field.id, 'matchField', event.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      disabled={saving}
                    >
                      <option value="">선택 안 함</option>
                      {configState.fields
                        .filter((candidate) => candidate.id !== field.id)
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {getFieldLabel(candidate)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {SIGNUP_MODES.map((mode) => (
                      <div key={`${field.id}-${mode}`} className="rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-900/40">
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{MODE_LABELS[mode]}</p>
                        <label className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={field.enabledModes.includes(mode)}
                            onChange={() => toggleFieldMode(field.id, mode, 'enabledModes')}
                            disabled={saving}
                          />
                          표시
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={field.requiredModes.includes(mode)}
                            onChange={() => toggleFieldMode(field.id, mode, 'requiredModes')}
                            disabled={saving}
                          />
                          필수 입력
                        </label>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveField(field.id)}
                    className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    disabled={saving}
                  >
                    항목 삭제
                  </button>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">로그인 화면 구성</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            로그인 화면에 표시할 입력 순서를 조정하세요. 이메일과 비밀번호 항목은 반드시 포함되어야 합니다.
          </p>

          <div className="space-y-2">
            {configState.loginLayout.map((fieldId, index) => {
              const field = fieldMap[fieldId];
              if (!field) {
                return (
                  <div key={`${fieldId}-${index}`} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    존재하지 않는 필드: {fieldId}
                  </div>
                );
              }
              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                >
                  <div>
                    <p className="font-semibold">{getFieldLabel(field)}</p>
                    <p className="text-[10px] text-slate-400">{field.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveLoginField(index, -1)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                      disabled={saving || index === 0}
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLoginField(index, 1)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                      disabled={saving || index === configState.loginLayout.length - 1}
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLoginField(field.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                      disabled={saving}
                    >
                      제거
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              onChange={(event) => {
                handleAddFieldToLogin(event.target.value);
                event.target.value = '';
              }}
              defaultValue=""
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              disabled={saving}
            >
              <option value="">로그인에 추가할 항목 선택</option>
              {configState.fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {getFieldLabel(field)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">회원가입 섹션 구성</h4>
            <button
              type="button"
              onClick={handleAddSection}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/60"
              disabled={saving}
            >
              섹션 추가
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">섹션 단위로 입력 항목을 묶어 순서를 조정할 수 있습니다.</p>

          <div className="space-y-3">
            {configState.registerLayout.map((section, sectionIndex) => (
              <div
                key={section.id}
                className="space-y-3 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">섹션 제목</span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(event) =>
                          handleSectionFieldChange(section.id, (current) => ({ ...current, title: event.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        disabled={saving}
                      />
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">스타일</span>
                    <select
                      value={section.style}
                      onChange={(event) =>
                        handleSectionFieldChange(section.id, (current) => ({ ...current, style: event.target.value }))
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      disabled={saving}
                    >
                      {SECTION_STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveSection(sectionIndex, -1)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                      disabled={saving || sectionIndex === 0}
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(sectionIndex, 1)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                      disabled={saving || sectionIndex === configState.registerLayout.length - 1}
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(section.id)}
                      className="rounded border border-rose-200 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      disabled={saving}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">설명</span>
                  <textarea
                    value={section.description}
                    onChange={(event) =>
                      handleSectionFieldChange(section.id, (current) => ({ ...current, description: event.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    rows={2}
                    disabled={saving}
                  />
                </label>

                <div className="space-y-2">
                  {section.fieldIds.map((fieldId, fieldIndex) => {
                    const field = fieldMap[fieldId];
                    if (!field) {
                      return (
                        <div key={`${fieldId}-${fieldIndex}`} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                          존재하지 않는 필드: {fieldId}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                      >
                        <div>
                          <p className="font-semibold">{getFieldLabel(field)}</p>
                          <p className="text-[10px] text-slate-400">{field.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveFieldWithinSection(section.id, fieldIndex, -1)}
                            className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                            disabled={saving || fieldIndex === 0}
                          >
                            위로
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFieldWithinSection(section.id, fieldIndex, 1)}
                            className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                            disabled={saving || fieldIndex === section.fieldIds.length - 1}
                          >
                            아래로
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldFromSection(section.id, field.id)}
                            className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/60"
                            disabled={saving}
                          >
                            제거
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    onChange={(event) => {
                      handleAddFieldToSection(section.id, event.target.value);
                      event.target.value = '';
                    }}
                    defaultValue=""
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    disabled={saving}
                  >
                    <option value="">섹션에 추가할 항목 선택</option>
                    {configState.fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {getFieldLabel(field)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">핵심 항목 매핑</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Firebase 인증과 사용자 프로필 저장에 사용할 필드를 선택합니다. 이메일과 비밀번호는 필수이며, 확인용 항목은 선택 사항입니다.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">이메일</span>
              <select
                value={configState.identity.emailFieldId || ''}
                onChange={(event) => handleIdentityChange('emailFieldId', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              >
                <option value="">선택하세요</option>
                {configState.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getFieldLabel(field)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">이메일 재입력</span>
              <select
                value={configState.identity.confirmEmailFieldId || ''}
                onChange={(event) => handleIdentityChange('confirmEmailFieldId', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              >
                <option value="">선택 안 함</option>
                {configState.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getFieldLabel(field)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">비밀번호</span>
              <select
                value={configState.identity.passwordFieldId || ''}
                onChange={(event) => handleIdentityChange('passwordFieldId', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              >
                <option value="">선택하세요</option>
                {configState.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getFieldLabel(field)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">비밀번호 재입력</span>
              <select
                value={configState.identity.confirmPasswordFieldId || ''}
                onChange={(event) => handleIdentityChange('confirmPasswordFieldId', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              >
                <option value="">선택 안 함</option>
                {configState.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getFieldLabel(field)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">프로필 표시 이름</span>
              <select
                value={configState.identity.displayNameFieldId || ''}
                onChange={(event) => handleIdentityChange('displayNameFieldId', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              >
                <option value="">선택 안 함</option>
                {configState.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getFieldLabel(field)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {(error || message) && (
          <div className="space-y-2">
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                {message}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={loadConfig}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:focus-visible:ring-offset-slate-900"
            disabled={loading || saving}
          >
            초기화
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-indigo-400 dark:focus-visible:ring-offset-slate-900"
            disabled={saving}
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}
