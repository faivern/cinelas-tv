import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import type { SortOption } from "../../hooks/sorting";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Check,
  ChevronDown,
  Star,
  type LucideIcon,
} from "lucide-react";

type Props = {
  value: SortOption;
  onChange: (option: SortOption) => void;
  className?: string;
};

const SORT_OPTIONS: { value: SortOption; label: string; icon: LucideIcon }[] = [
  { value: "bayesian", label: "Highest Rated", icon: Star },
  { value: "newest", label: "Newest", icon: Calendar },
  { value: "oldest", label: "Oldest", icon: Calendar },
  { value: "a-z", label: "A-Z", icon: ArrowDownAZ },
  { value: "z-a", label: "Z-A", icon: ArrowUpAZ },
];

export default function SortingDropdown({ value, onChange, className = "" }: Props) {
  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value);
  const SelectedIcon = selectedOption?.icon;

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative w-44 ${className}`}>
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-component-primary border border-outline py-2 pl-3 pr-10 text-left text-white     transition-all text-sm">
          <span className="flex items-center gap-2 truncate">
            {SelectedIcon && <SelectedIcon className="h-3 w-3 text-accent-primary" />}
            {selectedOption?.label || "Sort by"}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-subtle" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-(--z-dropdown) mt-1 max-h-60 w-full overflow-auto rounded-lg bg-component-primary border border-outline px-1 py-1 text-sm shadow-lg ">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Listbox.Option
                  key={option.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none rounded-md py-2 pl-10 pr-4 ${
                      active ? "bg-accent-primary/20 text-text-h1" : "text-subtle"
                    }`
                  }
                  value={option.value}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`flex items-center gap-2 ${
                          selected ? "font-medium text-white" : "font-normal"
                        }`}
                      >
                        <Icon className="h-3 w-3 opacity-60" />
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-primary">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              );
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
