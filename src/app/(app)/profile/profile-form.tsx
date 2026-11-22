"use client";

import { useActionState, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { FormAlert } from "@/components/auth-shell";
import { INTERESTS, MAX_AVATAR_MB } from "@/lib/constants";
import { extensionFor, uploadImage } from "@/lib/upload";
import type { Profile } from "@/lib/types";
import type { FormState } from "./actions";

export function ProfileForm({
  action,
  userId,
  profile,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  userId: string;
  profile: Profile;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(profile.interests ?? []);

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
    <form action={formAction} className="space-y-6">
      <section className="card p-6 sm:p-8">
        <h2 className="font-display text-2xl">Public profile</h2>
        <p className="mt-1 text-sm text-ink-soft">
          This is what people see after a Match or when they open your public profile.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-sage">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Profile" className="size-full object-cover" />
            ) : (
              <Camera className="size-6 text-sage-dark" aria-hidden />
            )}
          </div>
          <div>
            <label className="btn-secondary cursor-pointer px-4 py-2 text-sm">
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
              Change photo
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

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Full name</span>
            <input name="full_name" defaultValue={profile.full_name} className="field mt-2" maxLength={80} required />
          </label>
          <label className="block">
            <span className="eyebrow">City</span>
            <input name="city" defaultValue={profile.city} className="field mt-2" maxLength={80} required placeholder="Almaty" />
          </label>
          <label className="block sm:col-span-2">
            <span className="eyebrow">Bio <span className="normal-case tracking-normal text-ink-soft">· optional</span></span>
            <textarea name="bio" defaultValue={profile.bio} className="field mt-2 min-h-32 resize-y" maxLength={500} />
          </label>
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="font-display text-2xl">Interests</h2>
        <p className="mt-1 text-sm text-ink-soft">Optional. Pick up to 12.</p>
        <div className="mt-5 flex flex-wrap gap-2">
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
                    setPicked((prev) =>
                      on ? prev.filter((x) => x !== interest) : prev.length < 12 ? [...prev, interest] : prev,
                    )
                  }
                  className="peer sr-only"
                />
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm transition ${
                    on ? "border-sage-dark bg-sage-dark text-white" : "border-line bg-white/70 hover:border-sage-dark"
                  }`}
                >
                  {on && <Check className="size-3.5" aria-hidden />}
                  {interest}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 space-y-3">
        <FormAlert error={state.error} message={state.message} />
        <button type="submit" disabled={pending || uploading} className="btn-primary w-full py-4 text-lg">
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
