import React from 'react';
import { cleanPhoneDigits, formatUzPhone, toFullUzPhone } from '../../utils/formatters';

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label = 'Telefon raqami',
  placeholder = '90 123 45 67',
  required = false,
  className = '',
}) => {
  const digits = cleanPhoneDigits(value || '');
  const displayValue = formatUzPhone(digits);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = cleanPhoneDigits(raw);
    const full = cleaned ? toFullUzPhone(cleaned) : '';
    onChange(full);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
          {label} {required && <span className="text-violet-600">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center pointer-events-none text-slate-600 font-bold text-xs select-none pr-2 border-r border-slate-300">
          🇺🇿 +998
        </div>
        <input
          type="tel"
          required={required}
          value={displayValue}
          onChange={handleChange}
          maxLength={12} // "90 123 45 67" with spaces
          placeholder={placeholder}
          className="w-full pl-24 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs font-mono font-bold tracking-wide transition-colors shadow-2xs"
        />
      </div>
    </div>
  );
};
