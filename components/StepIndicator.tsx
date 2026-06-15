"use client";

import clsx from "clsx";
import { Check } from "lucide-react";

type Props = {
  currentStep: number;
  steps: string[];
};

export default function StepIndicator({ currentStep, steps }: Props) {
  return (
    <div className="flex items-center justify-center w-full">
      {steps.map((label, i) => {
        const stepNum  = i + 1;
        const isDone   = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isDone
                    ? "bg-aquila-700 text-white"
                    : isActive
                    ? "bg-gradient-to-br from-aquila-600 to-coral-500 text-white shadow-btn scale-110"
                    : "bg-aquila-100 text-aquila-400"
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                  isActive ? "text-coral-500" : isDone ? "text-aquila-400" : "text-stone-300"
                )}
              >
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className="flex mb-5 mx-1">
                <div
                  className={clsx(
                    "w-8 sm:w-14 h-0.5 rounded-full transition-all duration-500",
                    isDone ? "bg-aquila-400" : "bg-aquila-100"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
