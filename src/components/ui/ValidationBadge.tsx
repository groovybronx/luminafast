import React from 'react';

export type ValidationStatus = 'idle' | 'valid' | 'warning' | 'error';

interface ValidationBadgeProps {
  status: ValidationStatus;
  message?: string;
}

const STYLES: Record<ValidationStatus, string> = {
  idle: 'bg-neutral-700 text-neutral-200 border-neutral-500',
  valid: 'bg-green-700/40 text-green-200 border-green-500',
  warning: 'bg-yellow-700/40 text-yellow-200 border-yellow-500',
  error: 'bg-red-700/40 text-red-200 border-red-500',
};

const LABELS: Record<ValidationStatus, string> = {
  idle: 'Not checked',
  valid: 'Valid',
  warning: 'Warning',
  error: 'Error',
};

const ValidationBadge: React.FC<ValidationBadgeProps> = ({ status, message }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    role="status"
  >
    {message ?? LABELS[status]}
  </span>
);

export default ValidationBadge;
