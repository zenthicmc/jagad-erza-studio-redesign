"use client";

import React, { forwardRef, useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import * as FlagIcons from "country-flag-icons/react/3x2";

interface CountryCode {
  code: string;
  dial: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "ID", dial: "+62" },
  { code: "US", dial: "+1" },
  { code: "GB", dial: "+44" },
  { code: "AU", dial: "+61" },
  { code: "SG", dial: "+65" },
  { code: "MY", dial: "+60" },
  { code: "JP", dial: "+81" },
  { code: "KR", dial: "+82" },
  { code: "IN", dial: "+91" },
  { code: "CN", dial: "+86" },
  { code: "DE", dial: "+49" },
  { code: "FR", dial: "+33" },
  { code: "BR", dial: "+55" },
  { code: "SA", dial: "+966" },
  { code: "AE", dial: "+971" },
];

function CountryFlag({ code, className }: { code: string; className?: string }) {
  const Flag = FlagIcons[code as keyof typeof FlagIcons];
  if (!Flag) return null;
  return <Flag className={className} title={code} />;
}

type PhoneInputSize = "sm" | "md" | "lg";

const sizeStyles: Record<PhoneInputSize, {
  button: string;
  input: string;
  label: string;
  text: string;
}> = {
  sm: {
    button: "h-9 px-2.5 rounded-l-md",
    input:  "h-9 px-3 text-xs rounded-r-md",
    label:  "text-xs font-medium mb-1",
    text:   "text-xs",
  },
  md: {
    button: "h-11 px-3 rounded-l-lg",
    input:  "h-11 px-4 text-sm rounded-r-lg",
    label:  "text-sm font-medium mb-1.5",
    text:   "text-sm",
  },
  lg: {
    button: "h-14 px-4 rounded-l-lg",
    input:  "h-14 px-5 text-base rounded-r-lg",
    label:  "text-base font-medium mb-2",
    text:   "text-base",
  },
};

interface PhoneInputProps {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  name?: string;
  disabled?: boolean;
  inputSize?: PhoneInputSize;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, hint, placeholder, value, onChange, onBlur, name, disabled, inputSize = "md" }, ref) => {
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const styles = sizeStyles[inputSize];

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const formatPhone = (num: string): string => {
      const clean = num.replace(/[^0-9]/g, "");
      return clean.replace(/(.{4})(?=.)/g, "$1-");
    };

    const countryCodeDigits = selectedCountry.dial.replace(/[^0-9]/g, "").length;
    const maxLocalDigits = 15 - countryCodeDigits;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = e.target.value.replace(/[^0-9-]/g, "").replace(/-/g, "").slice(0, maxLocalDigits);
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: numericValue ? `${selectedCountry.dial}${numericValue}` : "", name: name || "" },
      };
      onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    };

    const rawDigits = value
      ? value.replace(selectedCountry.dial, "").replace(/[^0-9]/g, "").slice(0, maxLocalDigits)
      : "";
    const displayValue = formatPhone(rawDigits);

    const inputId = label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={`block text-foreground ${styles.label}`}>
            {label}
          </label>
        )}
        <div className="relative flex" ref={containerRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 bg-surface border shrink-0
              hover:bg-surface-hover transition-colors
              ${styles.button}
              ${error
                ? "border-red-500"
                : "border-border focus:border-primary/50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              border-r-0
            `.trim()}
          >
            <CountryFlag code={selectedCountry.code} className="w-5 h-[10px] shrink-0 rounded-sm object-cover" />
            <span className={`text-foreground font-medium ${styles.text}`}>{selectedCountry.dial}</span>
            <ChevronDown
              size={inputSize === "sm" ? 12 : 14}
              className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="numeric"
            pattern="[0-9\-]*"
            value={displayValue}
            onChange={handleChange}
            onBlur={onBlur}
            name={name}
            disabled={disabled}
            placeholder={placeholder || "812 3456 7890"}
            className={`
              flex-1 bg-surface border text-foreground
              placeholder:text-muted min-w-0
              focus:outline-none focus:ring-1 transition-colors
              ${styles.input}
              ${error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                : "border-border focus:border-primary/50 focus:ring-primary/25"
              }
            `.trim()}
          />

          {isOpen && (
            <div className="absolute z-50 left-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="max-h-60 overflow-y-auto py-1">
                {COUNTRY_CODES.map((country) => {
                  const isSelected = country.code === selectedCountry.code;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full px-3 py-2.5 text-sm text-left flex items-center justify-between
                        transition-colors
                        ${isSelected
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground hover:bg-surface-hover"
                        }
                      `.trim()}
                    >
                      <span className="flex items-center gap-2.5">
                        <CountryFlag code={country.code} className="w-5 h-[10px] shrink-0 rounded-sm object-cover" />
                        <span>{country.code}</span>
                        <span className="text-muted">{country.dial}</span>
                      </span>
                      {isSelected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
        {hint && !error && <p className="text-muted text-xs mt-1.5">{hint}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
export default PhoneInput;
