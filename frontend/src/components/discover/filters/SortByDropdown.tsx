import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import {
  Calendar,
  Check,
  ChevronDown,
  Flame,
  Star,
  type LucideIcon,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (sortBy: string) => void;
};

const SORT_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "popularity.desc", label: "Most Popular", icon: Flame },
  { value: "vote_average.desc", label: "Highest Rated", icon: Star },
  { value: "vote_average.asc", label: "Lowest Rated", icon: Star },
  { value: "primary_release_date.desc", label: "Newest", icon: Calendar },
  { value: "primary_release_date.asc", label: "Oldest", icon: Calendar },
];

export default function SortByDropdown({ value, onChange }: Props) {
  const selectedOption =
    SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <Listbox value={selectedOption} onChange={(opt) => onChange(opt.value)}>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-input border border-outline py-2 pl-3 pr-10 text-left text-white     transition-all text-sm">
          <span className="flex items-center gap-2 truncate">
            <SelectedIcon className="h-3 w-3 text-accent-primary" />
            {selectedOption.label}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-3 w-3 text-subtle" />
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
                    `relative cursor-pointer select-none rounded-md py-3 pl-10 pr-4 ${
                      active ? "bg-accent-primary/20 text-text-h1" : "text-subtle"
                    }`
                  }
                  value={option}
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
