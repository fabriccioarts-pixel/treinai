"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatarAction, removeAvatarAction } from "@/app/actions/profile-actions";
import { cn } from "@/lib/utils";

export function ProfileAvatarEditor({
  name,
  hasAvatar,
}: {
  name: string;
  hasAvatar: boolean;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    hasAvatar ? "/api/perfil/foto" : null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = name.charAt(0).toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const formData = new FormData();
    formData.set("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPhotoUrl(`/api/perfil/foto?v=${Date.now()}`);
    });

    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      await removeAvatarAction();
      setPhotoUrl(null);
    });
  }

  const displayUrl = previewUrl ?? photoUrl;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar size="lg" className="h-14 w-14">
          {displayUrl && <AvatarImage src={displayUrl} alt={name} />}
          <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>

        <label
          className={cn(
            "cursor-pointer",
            pending && "pointer-events-none opacity-70"
          )}
          aria-label="Alterar foto de perfil"
        >
          <AvatarBadge>
            {pending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Camera className="h-2.5 w-2.5" />
            )}
          </AvatarBadge>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={pending}
            onChange={handleFileChange}
          />
        </label>

        {photoUrl && !pending && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remover foto de perfil"
            className="absolute top-0 right-0 z-10 flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {error && <p className="max-w-24 text-center text-[11px] leading-tight text-destructive">{error}</p>}
    </div>
  );
}
