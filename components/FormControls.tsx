"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cx } from "@/components/ui";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Field({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function SelectField({
  placeholder,
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder: string;
  options: readonly SelectOption[];
}) {
  return (
    <select {...props}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option disabled={option.disabled} key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ChoiceToggle({
  selected,
  children,
  onClick
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={cx("choice", selected && "selected")} type="button" onClick={onClick}>
      <span>{children}</span>
      {selected && <Check aria-hidden="true" />}
    </button>
  );
}
