import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfiles, loginProfile } from "../../api/user.api";
import type { Profile } from "../../types/user";
import { useSignInModal } from "../../context/SignInModalContext";

export default function SignInModal() {
  const { isOpen, closeSignInModal, pendingCallback } = useSignInModal();
  const queryClient = useQueryClient();

  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
    enabled: isOpen,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isOpen) {
      setSubmittingId(null);
    }
  }, [isOpen]);

  async function pick(profile: Profile) {
    if (submittingId) return;
    setSubmittingId(profile.id);
    try {
      await loginProfile(profile.id);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      closeSignInModal();
      pendingCallback?.();
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-(--z-modal)" onClose={closeSignInModal}>
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
          <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-component-primary border border-outline shadow-xl">
                <div className="relative px-5 pt-5 pb-2">
                  <Dialog.Title className="text-center text-2xl text-white" style={{ fontFamily: "International" }}>
                    Cinelas
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={closeSignInModal}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 min-w-11 min-h-11 flex items-center justify-center text-subtle hover:text-text-h1 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-5 pb-6 pt-2">
                  <ProfileGrid
                    profiles={profiles}
                    isLoading={isLoading}
                    submittingId={submittingId}
                    onPick={pick}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  function ProfileGrid({
    profiles,
    isLoading,
    submittingId,
    onPick,
  }: {
    profiles: Profile[];
    isLoading: boolean;
    submittingId: string | null;
    onPick: (p: Profile) => void;
  }) {
    if (isLoading) {
      return <p className="py-8 text-center text-subtle">Loading profiles…</p>;
    }
    if (profiles.length === 0) {
      return <p className="py-8 text-center text-subtle">No profiles configured.</p>;
    }
    return (
      <>
        <p className="mb-4 text-center text-subtle text-lg">Who's watching?</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              disabled={submittingId !== null}
              className="flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-[var(--action-hover)] focus-visible:bg-[var(--action-hover)] disabled:opacity-60"
            >
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-component-secondary text-xl font-semibold text-text-h1">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  p.name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="max-w-full truncate text-sm text-text-h1">{p.name}</span>
            </button>
          ))}
        </div>
      </>
    );
  }
}
