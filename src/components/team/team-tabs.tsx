"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ProfilePhotoUpload } from "@/components/team/profile-photo-upload";

type HandlerCert = {
  id: string;
  name: string;
  expiresAt: string | null;
};

type Handler = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  avatarUrl: string | null;
  specialties: string[];
  specialtyLabels: string[];
  handlerNotes: string | null;
  inspectionCount: number;
  certifications: HandlerCert[];
  isSelf: boolean;
};

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  certificationNumber: string | null;
  certifiedUntil: string | null;
  photoUrl: string | null;
  teamName: string;
};

function isExpired(d: string | null | undefined) {
  return d ? new Date(d) < new Date() : false;
}

function isExpiringSoon(d: string | null | undefined) {
  if (!d) return false;
  const dt = new Date(d);
  if (dt < new Date()) return false;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  return dt < soon;
}

export function TeamTabs({
  handlers,
  dogs,
  canEdit,
  currentUserId,
}: {
  handlers: Handler[];
  dogs: Dog[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"handlers" | "dogs">("handlers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Handlers and K9 partners</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("handlers")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "handlers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Handlers
          <span className="ml-1.5 text-xs opacity-60">({handlers.length})</span>
        </button>
        <button
          onClick={() => setTab("dogs")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "dogs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Dogs
          <span className="ml-1.5 text-xs opacity-60">({dogs.length})</span>
        </button>
      </div>

      {tab === "handlers" && (
        <HandlersPanel handlers={handlers} canEdit={canEdit} currentUserId={currentUserId} />
      )}
      {tab === "dogs" && (
        <DogsPanel dogs={dogs} canEdit={canEdit} />
      )}
    </div>
  );
}

function HandlersPanel({
  handlers,
  canEdit,
  currentUserId,
}: {
  handlers: Handler[];
  canEdit: boolean;
  currentUserId: string;
}) {
  if (handlers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
        No handlers yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {handlers.map((h) => {
        const expiredCerts = h.certifications.filter((c) => isExpired(c.expiresAt));
        const expiringSoon = h.certifications.filter((c) => !isExpired(c.expiresAt) && isExpiringSoon(c.expiresAt));

        return (
          <div key={h.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <ProfilePhotoUpload
                entityId={h.id}
                entityType="user"
                currentPhotoUrl={h.avatarUrl}
                displayName={`${h.firstName} ${h.lastName}`}
                canEdit={canEdit || h.isSelf}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/team/handlers/${h.id}`}
                    className="font-semibold text-foreground text-sm hover:text-primary transition-colors"
                  >
                    {h.firstName} {h.lastName}
                  </Link>
                  {h.isSelf && (
                    <span className="text-[10px] font-medium text-primary">(you)</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(10,186,181,0.12)", color: "#0ABAB5" }}
                  >
                    {h.roleLabel}
                  </span>
                  {expiredCerts.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                      {expiredCerts.length} cert{expiredCerts.length !== 1 ? "s" : ""} expired
                    </span>
                  )}
                  {expiredCerts.length === 0 && expiringSoon.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-semibold">
                      cert expiring soon
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{h.email}</div>
                {h.phone && (
                  <div className="text-xs text-muted-foreground truncate">{h.phone}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {h.inspectionCount} inspection{h.inspectionCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {h.specialtyLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {h.specialtyLabels.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(10,186,181,0.08)", color: "#0ABAB5", border: "1px solid rgba(10,186,181,0.2)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <Link
              href={`/team/handlers/${h.id}`}
              className="text-xs font-medium transition-colors mt-auto"
              style={{ color: "#0ABAB5" }}
            >
              View profile →
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function DogsPanel({ dogs, canEdit }: { dogs: Dog[]; canEdit: boolean }) {
  if (dogs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
        No K9 dogs yet — add them in K9 Teams
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {dogs.map((dog) => (
        <div key={dog.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
          <ProfilePhotoUpload
            entityId={dog.id}
            entityType="dog"
            currentPhotoUrl={dog.photoUrl}
            displayName={dog.name}
            canEdit={canEdit}
          />
          <div className="flex-1 min-w-0">
            <Link
              href={`/k9teams/dogs/${dog.id}`}
              className="font-semibold text-foreground text-sm hover:text-primary transition-colors"
            >
              {dog.name}
            </Link>
            <div className="text-xs text-muted-foreground mt-0.5">{dog.teamName}</div>
            {dog.breed && (
              <div className="text-xs text-muted-foreground">{dog.breed}</div>
            )}
            {dog.certificationNumber && (
              <div className="text-xs text-muted-foreground mt-1.5">
                Cert #{dog.certificationNumber}
              </div>
            )}
            {dog.certifiedUntil && (
              <div className="text-xs mt-1">
                <span className={isExpired(dog.certifiedUntil) ? "text-red-500" : "text-muted-foreground"}>
                  Exp: {format(new Date(dog.certifiedUntil), "MMM d, yyyy")}
                </span>
              </div>
            )}
            <Link
              href={`/k9teams/dogs/${dog.id}`}
              className="text-xs mt-2 block transition-colors"
              style={{ color: "#0ABAB5" }}
            >
              View profile →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
