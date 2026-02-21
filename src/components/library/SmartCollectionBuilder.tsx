import React, { useState, useCallback, useMemo } from 'react';
import { X, Plus, Eye } from 'lucide-react';
import type {
  SmartQuery,
  SmartQueryRule,
  SmartQueryField,
  SmartQueryOperator,
} from '../../types/collection';

interface SmartCollectionBuilderProps {
  onSave: (query: SmartQuery, name: string) => Promise<void>;
  initialQuery?: SmartQuery;
  initialName?: string;
  previewImageCount?: number;
  isLoading?: boolean;
}

// Field type definitions
const FIELD_TYPES: Record<SmartQueryField, 'numeric' | 'string' | 'enum'> = {
  rating: 'numeric',
  iso: 'numeric',
  aperture: 'numeric',
  focal_length: 'numeric',
  camera_make: 'string',
  camera_model: 'string',
  lens: 'string',
  flag: 'enum',
  color_label: 'enum',
  filename: 'string',
};

const FIELD_LABELS: Record<SmartQueryField, string> = {
  rating: 'Rating',
  iso: 'ISO',
  aperture: 'Aperture (f-number)',
  focal_length: 'Focal Length',
  camera_make: 'Camera Make',
  camera_model: 'Camera Model',
  lens: 'Lens',
  flag: 'Flag',
  color_label: 'Color Label',
  filename: 'Filename',
};

// Operator definitions by field type
const NUMERIC_OPERATORS = ['=', '!=', '>', '>=', '<', '<='];
const STRING_OPERATORS = ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with'];
const ENUM_OPERATORS = ['=', '!='];

const FLAG_OPTIONS = ['pick', 'reject'];

function getOperatorsForField(field: SmartQueryField): string[] {
  const fieldType = FIELD_TYPES[field];
  switch (fieldType) {
    case 'numeric':
      return NUMERIC_OPERATORS;
    case 'string':
      return STRING_OPERATORS;
    case 'enum':
      return ENUM_OPERATORS;
    default:
      return [];
  }
}

export const SmartCollectionBuilder: React.FC<SmartCollectionBuilderProps> = ({
  onSave,
  initialQuery = { rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' },
  initialName = '',
  previewImageCount = 0,
  isLoading = false,
}) => {
  const [name, setName] = useState(initialName);
  const [query, setQuery] = useState<SmartQuery>(initialQuery);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Validation
  const isValid = useMemo(() => {
    return name.trim().length > 0 && query.rules.length > 0;
  }, [name, query.rules]);

  const handleAddRule = useCallback(() => {
    const newRule: SmartQueryRule = {
      field: 'rating',
      operator: '>=',
      value: 3,
    };
    setQuery((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }));
  }, []);

  const handleDeleteRule = useCallback((index: number) => {
    setQuery((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  }, []);

  const handleRuleChange = useCallback(
    (index: number, key: keyof SmartQueryRule, value: unknown) => {
      setQuery((prev) => ({
        ...prev,
        rules: prev.rules.map((rule, i) => {
          if (i === index) {
            const updated = { ...rule };
            if (key === 'field') {
              // Reset operator and value when field changes
              const field = value as SmartQueryField;
              const newOperators = getOperatorsForField(field);
              updated.field = field;
              updated.operator = (newOperators[0] || '=') as SmartQueryOperator;
              updated.value = FIELD_TYPES[field] === 'numeric' ? 0 : '';
            } else {
              (updated[key] as unknown) = value;
            }
            return updated;
          }
          return rule;
        }),
      }));
    },
    [],
  );

  const handleCombinatorChange = useCallback((newCombinator: 'AND' | 'OR') => {
    setQuery((prev) => ({
      ...prev,
      combinator: newCombinator,
    }));
  }, []);

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(query, name);
    } finally {
      setIsSaving(false);
    }
  };
  //TODO: refactor stuyle to match rest of app, add error handling, add ability to edit existing collection, add more fields and operators
  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      {/* Collection Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Collection Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Best Portraits"
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
      </div>

      {/* Rules */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Filter Rules</label>
        <div className="space-y-2">
          {query.rules.map((rule, index) => (
            <RuleRow
              key={index}
              rule={rule}
              onDelete={() => handleDeleteRule(index)}
              onChange={(key, value) => handleRuleChange(index, key, value)}
            />
          ))}
        </div>
        <button
          onClick={handleAddRule}
          disabled={isSaving}
          className="mt-2 flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Add Rule
        </button>
      </div>

      {/* Combinator */}
      {query.rules.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Combine Rules With
          </label>
          <div className="flex gap-2">
            {(['AND', 'OR'] as const).map((comb) => (
              <button
                key={comb}
                onClick={() => handleCombinatorChange(comb)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  query.combinator === comb
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                disabled={isSaving}
              >
                {comb}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="border-t border-slate-200 pt-3">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          disabled={isSaving}
        >
          <Eye size={16} />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
        {showPreview && (
          <div className="mt-2 p-2 bg-white border border-slate-200 rounded text-sm">
            {isLoading ? (
              <span className="text-slate-500">Loading preview...</span>
            ) : (
              <>
                <strong>{previewImageCount}</strong>
                {` image${previewImageCount !== 1 ? 's' : ''} match these filters`}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-slate-200 pt-3">
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Create Collection'}
        </button>
      </div>
    </div>
  );
};

interface RuleRowProps {
  rule: SmartQueryRule;
  onDelete: () => void;
  onChange: (key: keyof SmartQueryRule, value: unknown) => void;
}

function RuleRow({ rule, onDelete, onChange }: RuleRowProps) {
  const fieldType = FIELD_TYPES[rule.field];
  const operators = getOperatorsForField(rule.field);

  return (
    <div className="flex gap-2 items-end bg-white p-2 rounded border border-slate-200">
      {/* Field Select */}
      <select
        value={rule.field}
        onChange={(e) => onChange('field', e.target.value as SmartQueryField)}
        className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Filter field"
      >
        {(Object.keys(FIELD_TYPES) as SmartQueryField[]).map((field) => (
          <option key={field} value={field}>
            {FIELD_LABELS[field]}
          </option>
        ))}
      </select>

      {/* Operator Select */}
      <select
        value={rule.operator}
        onChange={(e) => onChange('operator', e.target.value)}
        className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Filter operator"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      {/* Value Input */}
      {fieldType === 'numeric' ? (
        <input
          type="number"
          value={typeof rule.value === 'number' ? rule.value : 0}
          onChange={(e) => onChange('value', parseFloat(e.target.value) || 0)}
          aria-label="Filter value"
          className="px-2 py-1 border border-slate-300 rounded text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : fieldType === 'enum' && rule.field === 'flag' ? (
        <select
          value={typeof rule.value === 'string' ? rule.value : 'pick'}
          onChange={(e) => onChange('value', e.target.value)}
          className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Flag value"
        >
          {FLAG_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={typeof rule.value === 'string' ? rule.value : ''}
          onChange={(e) => onChange('value', e.target.value)}
          placeholder="value"
          aria-label="Filter value"
          className="px-2 py-1 border border-slate-300 rounded text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
        aria-label="Delete rule"
      >
        <X size={18} />
      </button>
    </div>
  );
}
