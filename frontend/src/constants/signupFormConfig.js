// frontend/src/constants/signupFormConfig.js
// 회원가입/로그인 폼을 구성하는 설정과 정규화 헬퍼를 정의한다.
// Firestore(appSettings/signupForm)에 저장되는 구조와 동일해야 하며,
// Admin 설정 화면과 실제 인증 패널에서 모두 이 헬퍼를 사용한다.

export const SIGNUP_MODES = ['login', 'register'];

export const SIGNUP_FIELD_TYPES = [
  { value: 'text', label: '단일행 텍스트' },
  { value: 'email', label: '이메일' },
  { value: 'password', label: '비밀번호' },
  { value: 'number', label: '숫자' },
  { value: 'tel', label: '전화번호' },
  { value: 'textarea', label: '여러 줄 텍스트' },
  { value: 'select', label: '선택 목록' }
];

const DEFAULT_FIELD_OPTIONS = {
  email: [
    { value: '', label: '선택 안 함' }
  ],
  gender: [
    { value: '', label: '선택 안 함' },
    { value: 'female', label: '여성' },
    { value: 'male', label: '남성' },
    { value: 'other', label: '기타' }
  ]
};

const CURRENT_YEAR = new Date().getFullYear();

export const DEFAULT_SIGNUP_FORM_CONFIG = {
  fields: [
    {
      id: 'email',
      label: '이메일',
      type: 'email',
      placeholder: 'example@email.com',
      helpText: '비밀번호 재발급 시 사용할 이메일을 입력해주세요.',
      enabledModes: ['login', 'register'],
      requiredModes: ['login', 'register'],
      autoComplete: { login: 'email', register: 'email' }
    },
    {
      id: 'confirmEmail',
      label: '이메일 재입력',
      type: 'email',
      placeholder: '이메일을 한 번 더 입력하세요',
      enabledModes: ['register'],
      requiredModes: ['register'],
      matchField: 'email',
      autoComplete: { register: 'email' }
    },
    {
      id: 'password',
      label: '비밀번호',
      type: 'password',
      placeholder: '비밀번호',
      enabledModes: ['login', 'register'],
      requiredModes: ['login', 'register'],
      autoComplete: { login: 'current-password', register: 'new-password' },
      minLength: 6
    },
    {
      id: 'confirmPassword',
      label: '비밀번호 재입력',
      type: 'password',
      placeholder: '비밀번호를 다시 입력하세요',
      enabledModes: ['register'],
      requiredModes: ['register'],
      matchField: 'password',
      autoComplete: { register: 'new-password' }
    },
    {
      id: 'name',
      label: '이름',
      type: 'text',
      placeholder: '선택사항',
      enabledModes: ['register'],
      requiredModes: [],
      autoComplete: { register: 'name' }
    },
    {
      id: 'gender',
      label: '성별',
      type: 'select',
      placeholder: '선택 안 함',
      options: DEFAULT_FIELD_OPTIONS.gender,
      enabledModes: ['register'],
      requiredModes: []
    },
    {
      id: 'birthYear',
      label: '출생연도',
      type: 'number',
      placeholder: '예: 1990',
      min: 1900,
      max: CURRENT_YEAR,
      enabledModes: ['register'],
      requiredModes: []
    },
    {
      id: 'phone',
      label: '전화번호',
      type: 'tel',
      placeholder: '선택사항',
      enabledModes: ['register'],
      requiredModes: [],
      autoComplete: { register: 'tel' }
    }
  ],
  loginLayout: ['email', 'password'],
  registerLayout: [
    {
      id: 'account-info',
      title: '계정 정보',
      description: '이메일과 비밀번호를 다시 한 번 입력해 일치 여부를 확인해주세요.',
      style: 'default',
      fieldIds: ['email', 'confirmEmail', 'password', 'confirmPassword']
    },
    {
      id: 'optional-info',
      title: '선택 입력 항목',
      description: '추가 정보를 입력하면 맞춤형 서비스를 제공하는 데 도움이 됩니다.',
      style: 'card',
      fieldIds: ['name', 'gender', 'birthYear', 'phone']
    }
  ],
  identity: {
    emailFieldId: 'email',
    confirmEmailFieldId: 'confirmEmail',
    passwordFieldId: 'password',
    confirmPasswordFieldId: 'confirmPassword',
    displayNameFieldId: 'name'
  }
};

export function buildFieldMap(fields) {
  if (!Array.isArray(fields)) return {};
  return Object.fromEntries(fields.map((field) => [field.id, field]));
}

function normalizeModes(modes) {
  if (!Array.isArray(modes)) {
    return [];
  }
  const unique = Array.from(new Set(modes.filter((mode) => SIGNUP_MODES.includes(mode))));
  return unique;
}

function normalizeOptions(field) {
  if (field.type !== 'select') return undefined;
  const source = Array.isArray(field.options) ? field.options : DEFAULT_FIELD_OPTIONS[field.id] || [];
  return source
    .map((option) => ({
      value: typeof option?.value === 'string' ? option.value : '',
      label: typeof option?.label === 'string' ? option.label : ''
    }))
    .filter((option) => option.label !== '');
}

function normalizeAutoComplete(autoComplete) {
  if (!autoComplete) return {};
  if (typeof autoComplete === 'string') {
    return { login: autoComplete, register: autoComplete };
  }
  const result = {};
  SIGNUP_MODES.forEach((mode) => {
    if (typeof autoComplete?.[mode] === 'string') {
      result[mode] = autoComplete[mode];
    }
  });
  return result;
}

function normalizeField(field) {
  if (!field || typeof field !== 'object') {
    return null;
  }
  if (typeof field.id !== 'string' || field.id.trim() === '') {
    return null;
  }
  const type = SIGNUP_FIELD_TYPES.some((item) => item.value === field.type) ? field.type : 'text';
  const normalized = {
    id: field.id,
    label: typeof field.label === 'string' && field.label.trim() ? field.label.trim() : field.id,
    type,
    placeholder: typeof field.placeholder === 'string' ? field.placeholder : '',
    helpText: typeof field.helpText === 'string' ? field.helpText : '',
    enabledModes: normalizeModes(field.enabledModes),
    requiredModes: normalizeModes(field.requiredModes),
    defaultValue: typeof field.defaultValue === 'string' ? field.defaultValue : '',
    autoComplete: normalizeAutoComplete(field.autoComplete),
    matchField: typeof field.matchField === 'string' ? field.matchField : '',
    minLength: Number.isFinite(field.minLength) ? Number(field.minLength) : undefined,
    maxLength: Number.isFinite(field.maxLength) ? Number(field.maxLength) : undefined,
    min: Number.isFinite(field.min) ? Number(field.min) : undefined,
    max: Number.isFinite(field.max) ? Number(field.max) : undefined,
    step: Number.isFinite(field.step) ? Number(field.step) : undefined,
    pattern: typeof field.pattern === 'string' ? field.pattern : '',
    validationMessage: typeof field.validationMessage === 'string' ? field.validationMessage : ''
  };

  if (type === 'select') {
    normalized.options = normalizeOptions(field);
  }
  return normalized;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeLoginLayout(layout, fieldMap) {
  if (!Array.isArray(layout)) {
    return DEFAULT_SIGNUP_FORM_CONFIG.loginLayout.slice();
  }
  const filtered = layout.filter((fieldId) => fieldMap[fieldId]);
  const unique = uniqueById(filtered);
  if (unique.length === 0) {
    return DEFAULT_SIGNUP_FORM_CONFIG.loginLayout.filter((fieldId) => fieldMap[fieldId]);
  }
  return unique;
}

function normalizeRegisterLayout(sections, fieldMap) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return DEFAULT_SIGNUP_FORM_CONFIG.registerLayout.filter((section) =>
      Array.isArray(section.fieldIds)
    ).map((section) => ({
      ...section,
      fieldIds: section.fieldIds.filter((fieldId) => fieldMap[fieldId])
    }));
  }
  return sections
    .map((section, index) => {
      if (!section || typeof section !== 'object') {
        return null;
      }
      const id = typeof section.id === 'string' && section.id.trim() ? section.id : `section-${index + 1}`;
      const title = typeof section.title === 'string' && section.title.trim() ? section.title.trim() : `섹션 ${index + 1}`;
      const description = typeof section.description === 'string' ? section.description : '';
      const style = typeof section.style === 'string' ? section.style : 'default';
      const fieldIds = Array.isArray(section.fieldIds)
        ? uniqueById(section.fieldIds.filter((fieldId) => fieldMap[fieldId]))
        : [];
      return { id, title, description, style, fieldIds };
    })
    .filter(Boolean);
}

function normalizeIdentity(identity, fieldMap) {
  const fallback = DEFAULT_SIGNUP_FORM_CONFIG.identity;
  if (!identity || typeof identity !== 'object') {
    return { ...fallback };
  }
  const normalized = {};
  ['emailFieldId', 'confirmEmailFieldId', 'passwordFieldId', 'confirmPasswordFieldId', 'displayNameFieldId'].forEach((key) => {
    const value = identity[key];
    if (typeof value === 'string' && fieldMap[value]) {
      normalized[key] = value;
    } else if (fallback[key] && fieldMap[fallback[key]]) {
      normalized[key] = fallback[key];
    } else {
      normalized[key] = '';
    }
  });
  return normalized;
}

export function normalizeSignupFormConfig(source) {
  const base = source && typeof source === 'object' ? source : {};
  const fieldCandidates = Array.isArray(base.fields) && base.fields.length > 0 ? base.fields : DEFAULT_SIGNUP_FORM_CONFIG.fields;
  const fields = fieldCandidates
    .map((field) => normalizeField(field))
    .filter(Boolean);
  const fieldMap = buildFieldMap(fields);

  const loginLayout = normalizeLoginLayout(base.loginLayout, fieldMap);
  const registerLayout = normalizeRegisterLayout(base.registerLayout, fieldMap);
  const identity = normalizeIdentity(base.identity, fieldMap);

  return {
    fields,
    loginLayout,
    registerLayout,
    identity
  };
}

export function createDefaultSignupFormConfig() {
  return normalizeSignupFormConfig(DEFAULT_SIGNUP_FORM_CONFIG);
}

export function resolveAutoComplete(field, mode) {
  if (!field) return undefined;
  const source = normalizeAutoComplete(field.autoComplete);
  return source?.[mode];
}

export function getFieldLabel(field) {
  return field?.label ?? field?.id ?? '';
}
