"use client";

import { useState } from "react";
import clsx from "clsx";
import { User, Mail, MessageCircle } from "lucide-react";

export type ContactData = {
  name: string;
  email: string;
  whatsapp: string;
};

type FieldConfig = {
  key: keyof ContactData;
  label: string;
  placeholder: string;
  type: string;
  icon: React.ElementType;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete: string;
};

const FIELDS: FieldConfig[] = [
  {
    key: "name",
    label: "Nombre completo",
    placeholder: "Juan García",
    type: "text",
    icon: User,
    autoComplete: "name",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "juan@email.com",
    type: "email",
    icon: Mail,
    inputMode: "email",
    autoComplete: "email",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    placeholder: "+54 9 376 411-4013",
    type: "tel",
    icon: MessageCircle,
    inputMode: "tel",
    autoComplete: "tel",
  },
];

type Props = {
  data: ContactData;
  onChange: (data: ContactData) => void;
  errors: Partial<ContactData>;
};

export default function ContactForm({ data, onChange, errors }: Props) {
  const [focused, setFocused] = useState<keyof ContactData | null>(null);

  return (
    <div className="w-full flex flex-col gap-4">
      {FIELDS.map(({ key, label, placeholder, type, icon: Icon, inputMode, autoComplete }, i) => {
        const hasError  = !!errors[key];
        const isFocused = focused === key;

        return (
          <div
            key={key}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-slide-up flex flex-col gap-1.5"
          >
            <label htmlFor={key} className="text-xs font-bold text-aquila-700 pl-1 uppercase tracking-wider">
              {label}
            </label>

            <div
              className={clsx(
                "flex items-center gap-3 rounded-2xl border-2 bg-white px-4 transition-all duration-200",
                hasError
                  ? "border-red-300 bg-red-50/30"
                  : isFocused
                  ? "border-aquila-500 shadow-sm shadow-aquila-100"
                  : "border-aquila-100 hover:border-aquila-200"
              )}
            >
              <Icon
                className={clsx(
                  "w-4 h-4 shrink-0 transition-colors",
                  hasError   ? "text-red-400"    :
                  isFocused  ? "text-aquila-600"  : "text-aquila-300"
                )}
              />
              <input
                id={key}
                type={type}
                inputMode={inputMode}
                placeholder={placeholder}
                value={data[key]}
                autoComplete={autoComplete}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
                className="flex-1 min-h-[52px] bg-transparent text-sm text-aquila-900 placeholder:text-stone-400 outline-none"
              />
            </div>

            {hasError && (
              <p className="text-xs text-red-500 pl-1 animate-slide-down">{errors[key]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
