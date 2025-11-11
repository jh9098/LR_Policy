import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSignupFormSettings } from '../contexts/SignupFormSettingsContext.jsx';
import { buildFieldMap, getFieldLabel, resolveAutoComplete } from '../constants/signupFormConfig.js';

const MODE = {
  LOGIN: 'login',
  REGISTER: 'register'
};

function InputLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

InputLabel.propTypes = {
  htmlFor: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  required: PropTypes.bool
};

InputLabel.defaultProps = {
  required: false
};

function buildInitialValues(fields) {
  const initial = {};
  fields.forEach((field) => {
    if (!field || !field.id) return;
    initial[field.id] = typeof field.defaultValue === 'string' ? field.defaultValue : '';
  });
  return initial;
}

function mergeInitialValues(fields, prev) {
  const base = { ...prev };
  fields.forEach((field) => {
    if (!field || !field.id) return;
    if (!(field.id in base)) {
      base[field.id] = typeof field.defaultValue === 'string' ? field.defaultValue : '';
    }
  });
  return base;
}

export default function EmailPasswordAuthPanel({ className = '', heading = '이메일 로그인', description = '' }) {
  const { user, login, register, requestPasswordReset, processing, authError, authMessage, clearFeedback } = useAuth();
  const { config, loading: configLoading, error: configError } = useSignupFormSettings();
  const [mode, setMode] = useState(MODE.LOGIN);
  const [form, setForm] = useState(() => buildInitialValues(config.fields));
  const [errors, setErrors] = useState({});
  const [agreements, setAgreements] = useState({ privacy: false, terms: false });
  const [agreementError, setAgreementError] = useState('');

  useEffect(() => {
    setForm((prev) => mergeInitialValues(config.fields, prev));
  }, [config.fields]);

  useEffect(() => {
    if (user) {
      return;
    }
    clearFeedback();
  }, [mode, clearFeedback, user]);

  const fieldMap = useMemo(() => buildFieldMap(config.fields), [config.fields]);

  const loginFieldIds = useMemo(() => {
    return config.loginLayout.filter((fieldId) => fieldMap[fieldId]?.enabledModes.includes(MODE.LOGIN));
  }, [config.loginLayout, fieldMap]);

  const registerSections = useMemo(() => {
    return config.registerLayout
      .map((section) => ({
        ...section,
        fieldIds: section.fieldIds.filter((fieldId) => fieldMap[fieldId]?.enabledModes.includes(MODE.REGISTER))
      }))
      .filter((section) => section.fieldIds.length > 0);
  }, [config.registerLayout, fieldMap]);

  const headingText = useMemo(() => {
    if (heading) return heading;
    return mode === MODE.LOGIN ? '이메일 로그인' : '회원가입';
  }, [heading, mode]);

  const descriptionText = useMemo(() => {
    if (description) return description;
    if (mode === MODE.REGISTER) {
      const firstSection = registerSections[0];
      if (firstSection?.description) {
        return firstSection.description;
      }
      return '이메일과 비밀번호를 다시 한 번 입력해 일치 여부를 확인해주세요.';
    }
    return '등록된 이메일과 비밀번호를 입력해주세요.';
  }, [description, mode, registerSections]);

  const disabled = processing || configLoading;

  if (user) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' && value === '' ? '' : value
    }));
  };

  const handleAgreementChange = (event) => {
    const { name, checked } = event.target;
    setAgreements((prev) => ({
      ...prev,
      [name]: checked
    }));
    setAgreementError('');
  };

  const validateFields = (currentMode, fieldIds) => {
    const nextErrors = {};
    fieldIds.forEach((fieldId) => {
      const field = fieldMap[fieldId];
      if (!field) return;
      const value = form[fieldId];
      const trimmedValue = typeof value === 'string' ? value.trim() : value;

      if (field.requiredModes.includes(currentMode)) {
        const isEmpty =
          trimmedValue === '' || trimmedValue === undefined || trimmedValue === null || String(trimmedValue).trim() === '';
        if (isEmpty) {
          nextErrors[fieldId] = `${getFieldLabel(field)} 항목을 입력해주세요.`;
          return;
        }
      }

      if (typeof trimmedValue === 'string' && trimmedValue.length > 0) {
        if (field.type === 'email') {
          const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
          if (!emailRegex.test(trimmedValue)) {
            nextErrors[fieldId] = '유효한 이메일 주소를 입력해주세요.';
            return;
          }
        }
        if (field.minLength && trimmedValue.length < field.minLength) {
          nextErrors[fieldId] = `${field.minLength}자 이상 입력해주세요.`;
          return;
        }
        if (field.maxLength && trimmedValue.length > field.maxLength) {
          nextErrors[fieldId] = `${field.maxLength}자 이하로 입력해주세요.`;
          return;
        }
        if (field.pattern) {
          try {
            const pattern = new RegExp(field.pattern);
            if (!pattern.test(trimmedValue)) {
              nextErrors[fieldId] = field.validationMessage || `${getFieldLabel(field)} 형식이 올바르지 않습니다.`;
              return;
            }
          } catch (error) {
            console.warn('정규식 검사 실패:', error);
          }
        }
      }

      if (field.type === 'number' && trimmedValue !== '' && trimmedValue !== undefined && trimmedValue !== null) {
        const numericValue = Number(trimmedValue);
        if (Number.isNaN(numericValue)) {
          nextErrors[fieldId] = '숫자만 입력해주세요.';
          return;
        }
        if (typeof field.min === 'number' && numericValue < field.min) {
          nextErrors[fieldId] = `${field.min} 이상 값을 입력해주세요.`;
          return;
        }
        if (typeof field.max === 'number' && numericValue > field.max) {
          nextErrors[fieldId] = `${field.max} 이하 값을 입력해주세요.`;
          return;
        }
      }

      if (field.matchField) {
        const targetValue = (form[field.matchField] ?? '').toString().trim();
        const currentValue = (value ?? '').toString().trim();
        if (field.requiredModes.includes(currentMode) || currentValue.length > 0) {
          if (targetValue !== currentValue) {
            const targetLabel = getFieldLabel(fieldMap[field.matchField]);
            nextErrors[fieldId] = `${getFieldLabel(field)} 값이 ${targetLabel || '대상 항목'}과(와) 일치하지 않습니다.`;
          }
        }
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const gatherRegisterFieldIds = () => {
    const ids = [];
    registerSections.forEach((section) => {
      section.fieldIds.forEach((fieldId) => {
        if (!ids.includes(fieldId)) {
          ids.push(fieldId);
        }
      });
    });
    return ids;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === MODE.LOGIN) {
      const valid = validateFields(MODE.LOGIN, loginFieldIds);
      if (!valid) return;
      const identity = config.identity || {};
      const emailFieldId = identity.emailFieldId || 'email';
      const passwordFieldId = identity.passwordFieldId || 'password';
      const emailValue = (form[emailFieldId] ?? '').trim();
      const passwordValue = form[passwordFieldId] ?? '';
      try {
        await login(emailValue, passwordValue);
      } catch (error) {
        console.warn('로그인 실패:', error);
      }
      return;
    }

    const registerFieldIds = gatherRegisterFieldIds();
    const valid = validateFields(MODE.REGISTER, registerFieldIds);
    if (!valid) return;

    if (!agreements.terms || !agreements.privacy) {
      setAgreementError('필수 약관(이용약관, 개인정보처리방침)에 모두 동의해야 회원가입을 진행할 수 있습니다.');
      return;
    }

    setAgreementError('');

    try {
      await register({ values: form, config });
    } catch (error) {
      console.warn('회원가입 처리 중 오류:', error);
    }
  };

  const handlePasswordReset = async () => {
    const identity = config.identity || {};
    const emailFieldId = identity.emailFieldId || 'email';
    const emailValue = (form[emailFieldId] ?? '').trim();
    try {
      await requestPasswordReset(emailValue);
    } catch (error) {
      console.warn('비밀번호 재설정 요청 중 오류가 발생했습니다.', error);
    }
  };

  const toggleMode = () => {
    setErrors({});
    setAgreementError('');
    setAgreements({ privacy: false, terms: false });
    setMode((prev) => (prev === MODE.LOGIN ? MODE.REGISTER : MODE.LOGIN));
  };

  const renderFieldInput = (field) => {
    const value = form[field.id] ?? '';
    const commonProps = {
      id: `auth-${field.id}`,
      name: field.id,
      value,
      onChange: handleChange,
      disabled,
      className:
        'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
      placeholder: field.placeholder || undefined,
      autoComplete: resolveAutoComplete(field, mode)
    };

    if (field.type === 'textarea') {
      return <textarea {...commonProps} rows={field.rows || 3} />;
    }

    if (field.type === 'select') {
      return (
        <select {...commonProps}>
          {(field.options?.length ? field.options : [{ value: '', label: field.placeholder || '선택하세요' }]).map((option) => (
            <option key={`${field.id}-${option.value ?? 'empty'}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    const type = ['email', 'password', 'number', 'tel'].includes(field.type) ? field.type : 'text';
    const extraProps = {};
    if (type === 'number') {
      extraProps.inputMode = 'numeric';
      if (typeof field.min === 'number') extraProps.min = field.min;
      if (typeof field.max === 'number') extraProps.max = field.max;
      if (typeof field.step === 'number') extraProps.step = field.step;
    }
    if (field.minLength) extraProps.minLength = field.minLength;
    if (field.maxLength) extraProps.maxLength = field.maxLength;
    if (field.pattern) extraProps.pattern = field.pattern;

    return <input {...commonProps} type={type} {...extraProps} />;
  };

  const renderLoginFields = () => {
    return loginFieldIds.map((fieldId) => {
      const field = fieldMap[fieldId];
      if (!field) return null;
      const errorMessage = errors[field.id];
      const required = field.requiredModes.includes(MODE.LOGIN);
      return (
        <div key={field.id}>
          <InputLabel htmlFor={`auth-${field.id}`} required={required}>
            {getFieldLabel(field)}
          </InputLabel>
          {renderFieldInput(field)}
          {field.helpText && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{field.helpText}</p>
          )}
          {errorMessage && (
            <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">{errorMessage}</p>
          )}
        </div>
      );
    });
  };

  const renderRegisterFields = () => {
    const renderedIds = new Set();
    return registerSections.map((section) => {
      const content = section.fieldIds
        .map((fieldId) => {
          if (renderedIds.has(fieldId)) return null;
          const field = fieldMap[fieldId];
          if (!field) return null;
          renderedIds.add(fieldId);
          const errorMessage = errors[field.id];
          const required = field.requiredModes.includes(MODE.REGISTER);
          return (
            <div key={field.id}>
              <InputLabel htmlFor={`auth-${field.id}`} required={required}>
                {getFieldLabel(field)}
              </InputLabel>
              {renderFieldInput(field)}
              {field.helpText && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{field.helpText}</p>
              )}
              {errorMessage && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">{errorMessage}</p>
              )}
            </div>
          );
        })
        .filter(Boolean);

      if (content.length === 0) {
        return null;
      }

      const WrapperTag = section.style === 'card' ? 'div' : 'section';
      const wrapperClassName =
        section.style === 'card'
          ? 'grid gap-2 rounded-lg bg-slate-50/70 p-3 dark:bg-slate-900/50'
          : 'grid gap-2';

      return (
        <WrapperTag key={section.id} className={wrapperClassName}>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{section.title}</p>
            {section.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{section.description}</p>
            )}
          </div>
          <div className="grid gap-2">{content}</div>
        </WrapperTag>
      );
    });
  };

  const renderAgreementSection = () => {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">필수 동의</p>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="terms"
            checked={agreements.terms}
            onChange={handleAgreementChange}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-500"
            disabled={disabled}
          />
          <span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">[필수]</span>{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              이용약관
            </a>
            에 동의합니다.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="privacy"
            checked={agreements.privacy}
            onChange={handleAgreementChange}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-500"
            disabled={disabled}
          />
          <span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">[필수]</span>{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              개인정보처리방침
            </a>
            에 동의합니다.
          </span>
        </label>
        {agreementError && (
          <p className="text-[11px] text-rose-600 dark:text-rose-300">{agreementError}</p>
        )}
      </div>
    );
  };

  const registerAgreementsSatisfied = agreements.privacy && agreements.terms;
  const submitDisabled = disabled || (mode === MODE.REGISTER && !registerAgreementsSatisfied);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800/90 ${className}`}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{headingText}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{descriptionText}</p>
          {configError && (
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-300">{configError}</p>
          )}
        </div>

        <div className="space-y-2">
          {mode === MODE.LOGIN ? (
            renderLoginFields()
          ) : (
            <>
              {renderRegisterFields()}
              {renderAgreementSection()}
            </>
          )}
        </div>

        {authError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {authError}
          </div>
        )}
        {authMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            {authMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-indigo-400 dark:focus-visible:ring-offset-slate-900"
            disabled={submitDisabled}
          >
            {mode === MODE.LOGIN ? '로그인' : '회원가입'}
          </button>
          <button
            type="button"
            onClick={toggleMode}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:focus-visible:ring-offset-slate-900"
            disabled={disabled}
          >
            {mode === MODE.LOGIN ? '회원가입 화면으로' : '로그인 화면으로'}
          </button>
        </div>

        <button
          type="button"
          onClick={handlePasswordReset}
          className="text-[11px] text-slate-500 underline-offset-2 transition hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-300"
          disabled={disabled}
        >
          비밀번호 재설정
        </button>
      </form>
    </div>
  );
}

EmailPasswordAuthPanel.propTypes = {
  className: PropTypes.string,
  heading: PropTypes.string,
  description: PropTypes.string
};
