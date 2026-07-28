import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import WatchProviderCard from "./cards/WatchProviderCard";
import type { WatchProviderListItem } from "../../types/tmdb";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  providers: WatchProviderListItem[];
  region: string;
};

export default function AllProvidersModal({
  isOpen,
  onClose,
  providers,
  region,
}: Props) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-(--z-modal)" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl max-h-[85vh] rounded-2xl bg-component-primary border border-outline shadow-xl flex flex-col overflow-hidden">
                <div className="relative px-5 pt-5 pb-3">
                  <Dialog.Title className="text-2xl font-bold text-text-h1">
                    All Streaming Services
                  </Dialog.Title>
                  <p className="text-sm text-gray-400 mt-1">
                    {providers.length} services
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 min-w-11 min-h-11 flex items-center justify-center text-subtle hover:text-text-h1 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto p-5">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
                    {providers.map((provider) => (
                      <WatchProviderCard
                        key={provider.provider_id}
                        providerId={provider.provider_id}
                        providerName={provider.provider_name}
                        logoPath={provider.logo_path}
                        region={region}
                      />
                    ))}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
