// frontend/src/components/admin/SimpleListEditor.jsx
// 문자열 배열을 편집하기 위한 공통 컴포넌트.
// 개선: tone prop(선택)으로 버튼/포커스 색상을 테마에 맞게 변경 가능. 기본값은 emerald.

import PropTypes from 'prop-types';

const TONE = {
  emerald: { btn: 'bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-400', ring: 'focus-visible:ring-emerald-500' },
  amber: { btn: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400', ring: 'focus-visible:ring-amber-500' },
  violet: { btn: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-400', ring: 'focus-visible:ring-violet-500' },
  sky: { btn: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-400', ring: 'focus-visible:ring-sky-500' },
  indigo: { btn: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400', ring: 'focus-visible:ring-indigo-500' },
  purple: { btn: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-400', ring: 'focus-visible:ring-purple-500' },
  slate: { btn: 'bg-slate-700 hover:bg-slate-800 focus-visible:ring-slate-400', ring: 'focus-visible:ring-slate-500' }
};

function cls(base, extra) {
  return [base, extra].filter(Boolean).join(' ');
}

function SimpleListEditor({
  title,
  description,
  items,
  onChange,
  addLabel,
  itemPlaceholder,
  tone
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const tc = TONE[tone] ?? TONE.emerald;

  const handleItemChange = (index, value) => {
    const next = [...safeItems];
    next[index] = value;
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...safeItems, '']);
  };

  const handleRemove = (index) => {
    const next = [...safeItems];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {description ? <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className={cls('inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2', tc.btn)}
        >
          {addLabel}
        </button>
      </div>

      {safeItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
          아직 항목이 없습니다. "{addLabel}" 버튼을 눌러 추가하세요.
        </p>
      ) : null}

      <div className="space-y-3">
        {safeItems.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3">
            <textarea
              value={item}
              onChange={(event) => handleItemChange(index, event.target.value)}
              className={cls(
                'min-h-[70px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                tc.ring
              )}
              placeholder={itemPlaceholder}
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

SimpleListEditor.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  addLabel: PropTypes.string,
  itemPlaceholder: PropTypes.string,
  // 선택: 테마 톤 (emerald/amber/violet/sky/indigo/purple/slate)
  tone: PropTypes.oneOf(['emerald', 'amber', 'violet', 'sky', 'indigo', 'purple', 'slate'])
};

SimpleListEditor.defaultProps = {
  description: '',
  items: [],
  addLabel: '항목 추가',
  itemPlaceholder: '',
  tone: 'emerald'
};

export default SimpleListEditor;
