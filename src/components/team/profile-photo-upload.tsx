"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Camera } from "lucide-react";
import { toast } from "sonner";

type Props = {
  entityId: string;
  entityType: "user" | "dog";
  currentPhotoUrl: string | null;
  displayName: string;
  canEdit: boolean;
};

export function ProfilePhotoUpload({ entityId, entityType, currentPhotoUrl, displayName, canEdit }: Props) {
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("profilePhoto");

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      const url = uploaded?.[0]?.url;
      if (!url) { toast.error("Upload failed"); return; }

      const apiPath = entityType === "user"
        ? `/api/users/${entityId}`
        : `/api/k9dogs/${entityId}`;

      const body = entityType === "user"
        ? { avatarUrl: url }
        : { photoUrl: url };

      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) { toast.error("Failed to save photo"); return; }
      setPhotoUrl(url);
      toast.success("Photo updated");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative group w-16 h-16 shrink-0">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={displayName}
          className="w-16 h-16 rounded-xl object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white select-none"
          style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}>
          {initials}
        </div>
      )}

      {canEdit && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Change photo"
          >
            {uploading ? (
              <span className="text-white text-[10px] font-semibold">…</span>
            ) : (
              <Camera className="h-4 w-4 text-white" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}
