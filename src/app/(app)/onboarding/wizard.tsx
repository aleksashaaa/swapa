"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2 } from "lucide-react";
import { FormAlert } from "@/components/auth-shell";
import { INTERESTS, MAX_AVATAR_MB } from "@/lib/constants";
import { extensionFor, uploadImage } from "@/lib/upload";
import { saveOnboarding, type OnboardingState } from "./actions";

export function OnboardingWizard({
  userId,
  fullName,
  city,
  bio,
  avatarUrl,
  interests,
}: {
  userId: string;
  fullName: string;
  city: string;
  bio: string;
  avatarUrl: string | null;
  interests: string[];
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveOnboarding, {});
  const [step, setStep] = useState(0);
  const [name, setName] = useState(fullName);
  const [cityValue, setCityValue] = useState(city);
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(interests);

  const total = 3;
  const canContinue = step === 0 ? name.trim().length >= 2 : step === 1 ? cityValue.trim().length >= 2 : true;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const path = `${userId}/avatar-${Date.now()}.${extensionFor(file)}`;
      const url = await uploadImage({ bucket: "avatars", path, file, maxMb: MAX_AVATAR_MB });
      setAvatar(url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-sage-dark" : "bg-sage"}`}
              />
            ))}
          </div>
          <span className="font-mono text-xs text-ink-soft">
            {step + 1} / {total}
          </span>
        </div>

        <p className="eyebrow mt-8">
          {step === 0 ? `Hi ${fullName.split(" ")[0] || "there"}` : step === 1 ? "Your corner of the city" : "What you love"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
          {step === 0 ? (
            <>Let&apos;s make it <em className="italic text-sage-dark">yours.</em></>
          ) : step === 1 ? (
            <>Where are you <em className="italic text-sage-dark">swapping?</em></>
          ) : (
            <>A little about <em className="italic text-sage-dark">you.</em></>
          )}
        </h1>

        <div className="mt-8 space-y-6">
          <div className={step === 0 ? "space-y-6" : "hidden"}>
            <label className="block">
              <span className="eyebrow">Your name</span>
              <input
                className="field mt-2"
                name="full_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
                placeholder="Alex Morgan"
              />
            </label>

            <div>
              <span className="eyebrow">Profile photo</span>
              <div className="mt-3 flex items-center gap-4">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="Profile preview" className="size-full object-cover" />
                  ) : (
                    <Camera className="size-6 text-sage-dark" aria-hidden />
                  )}
                </div>
                <div>
                  <label className="btn-secondary cursor-pointer px-4 py-2 text-sm">
                    {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
                    {avatar ? "Change photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </label>
                  <p className="mt-2 text-xs text-ink-soft">JPG, PNG or WebP. Max {MAX_AVATAR_MB} MB.</p>
                </div>
              </div>
              <input type="hidden" name="avatar_url" value={avatar} />
              {uploadError && <p className="mt-2 text-sm text-[#8B3D1F]">{uploadError}</p>}
            </div>
          </div>

          <div className={step === 1 ? "space-y-6" : "hidden"}>
            <label className="block">
              <span className="eyebrow">City</span>
              <input
                className="field mt-2"
                name="city"
                value={cityValue}
                onChange={(e) => setCityValue(e.target.value)}
                maxLength={80}
                required
                placeholder="Almaty"
              />
              <span className="mt-1.5 block text-xs text-ink-soft">
                Only your city is shown. Your address is never shared.
              </span>
            </label>
            <label className="block">
              <span className="eyebrow">Bio <span className="normal-case tracking-normal text-ink-soft">· optional</span></span>
              <textarea
                className="field mt-2 min-h-32 resize-y"
                name="bio"
                defaultValue={bio}
                maxLength={500}
                placeholder="Tell people what you like to swap, your style, or what you're looking for."
              />
            </label>
          </div>

          <div className={step === 2 ? "space-y-4" : "hidden"}>
            <p className="text-ink-soft">
              Pick a few interests so your profile feels personal. You can change these later.
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const on = picked.includes(interest);
                return (
                  <label key={interest} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest}
                      checked={on}
                      onChange={() =>
                        setPicked((prev) => (on ? prev.filter((x) => x !== interest) : [...prev, interest]))
                      }
                      className="peer sr-only"
                    />
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm transition ${
                        on
                          ? "border-sage-dark bg-sage-dark text-white"
                          : "border-line bg-white/70 hover:border-sage-dark"
                      }`}
                    >
                      {on && <Check className="size-3.5" aria-hidden />}
                      {interest}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <FormAlert error={state.error} />
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary px-5 py-3.5">
                <ArrowLeft className="size-4" aria-hidden /> Back
              </button>
            )}
            {step < total - 1 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
                className="btn-primary flex-1 py-3.5 text-lg"
              >
                Continue <ArrowRight className="size-5" aria-hidden />
              </button>
            ) : (
              <button type="submit" disabled={pending} className="btn-primary flex-1 py-3.5 text-lg">
                {pending ? "Saving…" : "Start discovering"}
                {!pending && <ArrowRight className="size-5" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="card p-6">
          <p className="eyebrow">Your profile preview</p>
          <div className="mt-5 flex items-center gap-4">
            <div className="grid size-16 place-items-center overflow-hidden rounded-full bg-sage">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="size-full object-cover" />
              ) : (
                <Camera className="size-5 text-sage-dark" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl">{name || "Your name"}</p>
              <p className="text-sm text-ink-soft">{cityValue || "Your city"}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {picked.length ? (
              picked.map((x) => (
                <span key={x} className="badge-sage">
                  {x}
                </span>
              ))
            ) : (
              <span className="text-sm text-ink-soft">Your interests will appear here.</span>
            )}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-sage/40 p-2.5">
              <p className="font-display text-xl">0</p>
              <p className="text-ink-soft">Swaps</p>
            </div>
            <div className="rounded-xl bg-sage/40 p-2.5">
              <p className="font-display text-xl">0</p>
              <p className="text-ink-soft">Reviews</p>
            </div>
            <div className="rounded-xl bg-sage/40 p-2.5">
              <p className="font-display text-xl">—</p>
              <p className="text-ink-soft">Rating</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          SWAPA only shows your name, photo, city, rating and reviews. Your email and exact address
          stay private.
        </p>
      </aside>
    </form>
  );
}
