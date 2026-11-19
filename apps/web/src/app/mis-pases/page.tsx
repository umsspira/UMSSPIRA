"use client";

import React, { useEffect, useState } from "react";
import { ConnectedNavbar } from "@/shared/components/navbar/index";
import { EventPassCard } from "@/modules/events/components/EventPassCard";
import { apiClient } from "@/shared/services/api-client";
import { QrCode } from "lucide-react";
import {
  getOfflineQrPasses,
  type OfflineQrPass,
} from "@/features/event-passes/offline/offline-qr-storage";
import { getOfflineSessionUserId } from "@/features/event-passes/offline/offline-session";
import "@/app/(dashboard)/events/events.css";

interface PassData {
  id: string;
  registrationId: string;
  eventId: string;
  userId: string;
  qrToken: string;
  status: "VALID" | "INVALID" | "ERROR" | "RECOVERED" | "ACTIVO";
  isValidForAccess: boolean;
  issuedAt: string;
  eventDetails?: {
    name: string;
    userName: string;
    dateTime: string;
    location: string;
  };
}

export default function MyPassesPage() {
  const [passes, setPasses] = useState<PassData[]>([]);
  const [loading, setLoading] = useState(true);

  // HU09: QR guardados en el dispositivo.
  const [offlinePasses, setOfflinePasses] = useState<OfflineQrPass[]>([]);
  const [selectedOfflineId, setSelectedOfflineId] = useState<string | null>(null);
  const [offlineError, setOfflineError] = useState(false);

  useEffect(() => {
    const userId = getOfflineSessionUserId();
    if (!userId) return;

    void getOfflineQrPasses(userId)
      .then(setOfflinePasses)
      .catch(() => setOfflineError(true));
  }, []);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      const response = await apiClient<PassData[] | { data: PassData[] }>(
        "/api/v1/registrations/my-passes",
        { authenticated: true }
      );
      const list = Array.isArray(response) ? response : response?.data ?? [];
      setPasses(list);
    } catch (error) {
      console.error("Error al obtener los pases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPasses();
  }, []);

  if (loading) {
    return (
      <>
        <ConnectedNavbar />
        <div className="events-app min-h-screen flex items-center justify-center">
          <p>Cargando tus pases...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ConnectedNavbar />
      <div className="events-app min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="font-bold text-[32px] mb-8">
            Mis Credenciales
          </h1>

          {/* HU09: acceso directo a los QR guardados en este dispositivo */}
          <section aria-labelledby="qr-guardados-title" className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              >
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <h2 id="qr-guardados-title" className="font-bold text-[20px]">
                  Guardados en este dispositivo
                </h2>
                <p className="text-[13px]">
                  Disponibles sin conexión. Toca uno para ver su código QR.
                </p>
              </div>
            </div>

            {offlineError ? (
              <p role="alert">
                No se pudieron leer los QR guardados en este dispositivo.
              </p>
            ) : offlinePasses.length === 0 ? (
              <p>
                Aún no has guardado códigos QR en este dispositivo.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {offlinePasses.map((offline) => {
                  const isSelected = selectedOfflineId === offline.id;

                  return (
                    <li key={offline.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          setSelectedOfflineId(isSelected ? null : offline.id)
                        }
                        className={`w-full min-h-[44px] text-left bg-white p-4 rounded-2xl border shadow-sm transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-200"
                            : "border-[#C9C1B1] hover:shadow-md"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-[15px] truncate">
                            {offline.eventDetails.name}
                          </span>
                          <span className="block text-[12px] truncate">
                            {offline.eventDetails.location}
                          </span>
                        </span>
                        <QrCode
                          className="h-5 w-5 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedOfflineId &&
              (() => {
                const selected = offlinePasses.find(
                  (item) => item.id === selectedOfflineId
                );

                if (!selected) return null;

                return (
                  <div className="pt-2">
                    <EventPassCard
                      status="ACTIVO"
                      statusLabel="GUARDADO SIN CONEXIÓN"
                      eventName={selected.eventDetails.name}
                      userName={selected.eventDetails.userName}
                      dateTime={selected.eventDetails.dateTime}
                      location={selected.eventDetails.location}
                      passId={selected.id}
                      qrToken={selected.qrToken}
                      hideBackButton
                      onBack={() => setSelectedOfflineId(null)}
                    />
                  </div>
                );
              })()}
          </section>

          {passes.length === 0 ? (
            <p>No tienes pases generados actualmente.</p>
          ) : (
            passes.map((pass) => (
              <EventPassCard
                key={pass.id}
                status={!pass.isValidForAccess ? "INVALID" : pass.status}
                eventName={pass.eventDetails?.name || "Evento UMSSPIRA"}
                userName={pass.eventDetails?.userName || "Titulado"}
                dateTime={pass.eventDetails?.dateTime || "Fecha por definir"}
                location={pass.eventDetails?.location || "Campus UMSS"}
                passId={pass.id.split("-").pop()}
                qrToken={pass.qrToken}
                onBack={() => window.history.back()}
                onRetry={() => window.location.reload()}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
