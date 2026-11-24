"use client";

import React, { useEffect, useState } from "react";
import type { EventPassDto } from '@umsspira/shared-types';
import { ConnectedNavbar } from "@/shared/components/navbar/index";
import { EventPassCard } from "@/modules/events/components/EventPassCard";
import { EventPassQrCard } from "@/features/event-passes/event-pass-qr-card";
import { apiClient } from "@/shared/services/api-client";
import { QrCode } from "lucide-react";
import {
  deleteOfflineQrPass,
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
  status: "VALID" | "INVALID" | "ERROR" | "RECOVERED" | "ACTIVO" | "INVALIDADO" | "VENCIDO";
  isValidForAccess: boolean;
  issuedAt: string;
  eventDetails?: {
    name: string;
    userName: string;
    dateTime: string;
    location: string;
  };
}


function toEventPassDto(pass: PassData): EventPassDto {
  const authorized =
    pass.isValidForAccess &&
    pass.qrToken.trim() !== '' &&
    ['ACTIVO', 'VALID', 'RECOVERED'].includes(pass.status);

  return {
    id: pass.id,
    registrationId: pass.registrationId,
    eventId: pass.eventId,
    userId: pass.userId,
    qrToken: pass.qrToken,
    status: authorized ? 'ACTIVO' : pass.status === 'VENCIDO' ? 'VENCIDO' : 'INVALIDADO',
    isValidForAccess: authorized,
    issuedAt: pass.issuedAt,
    expiresAt: null,
    eventDetails: {
      name: pass.eventDetails?.name || 'Evento UMSSPIRA',
      userName: pass.eventDetails?.userName || 'Titulado',
      dateTime: pass.eventDetails?.dateTime || '',
      location: pass.eventDetails?.location || 'Ubicación no disponible',
    },
  };
}
export default function MyPassesPage() {
  const [passes, setPasses] = useState<PassData[]>([]);
  const [loading, setLoading] = useState(true);

  // HU09: QR guardados en el dispositivo.
  const [offlinePasses, setOfflinePasses] = useState<OfflineQrPass[]>([]);
  const [selectedOfflineId, setSelectedOfflineId] = useState<string | null>(null);
  // Pases del servidor: también salen compactos y solo se abren al tocar «Ver QR».
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [offlineError, setOfflineError] = useState(false);
  const [offlineActionMessage, setOfflineActionMessage] = useState('');

  useEffect(() => {
    const userId = getOfflineSessionUserId();
    if (!userId) return;

    void getOfflineQrPasses(userId)
      .then(setOfflinePasses)
      .catch(() => setOfflineError(true));
  }, []);

  const removeOfflinePass = async (pass: OfflineQrPass) => {
    const confirmed = window.confirm(
      `¿Eliminar de este dispositivo el QR de ${pass.eventDetails.name}?`
    );
    if (!confirmed) return;

    try {
      const removed = await deleteOfflineQrPass(pass.id, pass.userId);
      if (!removed) {
        setOfflineActionMessage('No se encontró el QR guardado en este dispositivo.');
        return;
      }
      setOfflinePasses((current) => current.filter((item) => item.id !== pass.id));
      setSelectedOfflineId((current) => current === pass.id ? null : current);
      setOfflineActionMessage('El QR se eliminó de este dispositivo.');
    } catch {
      setOfflineActionMessage('No se pudo eliminar el QR. Inténtalo de nuevo.');
    }
  };

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

  const serverOnlyPasses = passes.filter(
    (pass) => !offlinePasses.some((saved) => saved.id === pass.id),
  );

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
            Mis códigos QR
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

            {offlineError && (
              <p role="alert">
                No se pudieron leer los QR guardados en este dispositivo.
              </p>
            )}

            {!offlineError && offlinePasses.length === 0 && serverOnlyPasses.length === 0 && (
              <p>
                Aún no has guardado códigos QR en este dispositivo.
              </p>
            )}

            {(offlinePasses.length > 0 || serverOnlyPasses.length > 0) && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {offlinePasses.map((offline) => {
                  const isSelected = selectedOfflineId === offline.id;

                  return (
                    <li key={`offline-${offline.id}`} className="flex items-stretch gap-2">
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
                        <span className="shrink-0 text-sm font-semibold text-emerald-700">{isSelected ? 'Ocultar QR' : 'Ver QR'}</span>
                        <QrCode
                          className="h-5 w-5 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        className="min-h-[44px] shrink-0 rounded-xl border border-red-300 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                        aria-label={`Eliminar de este dispositivo: ${offline.eventDetails.name}`}
                        onClick={() => void removeOfflinePass(offline)}
                      >
                        Eliminar
                      </button>
                    </li>
                  );
                })}

                {serverOnlyPasses.map((pass) => {
                  const isSelected = selectedServerId === pass.id;
                  const name = pass.eventDetails?.name || 'Evento UMSSPIRA';
                  const location = pass.eventDetails?.location || 'Ubicación no disponible';

                  return (
                    <li key={`server-${pass.id}`} className="flex items-stretch gap-2">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          setSelectedServerId(isSelected ? null : pass.id)
                        }
                        className={`w-full min-h-[44px] text-left bg-white p-4 rounded-2xl border shadow-sm transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-200"
                            : "border-[#C9C1B1] hover:shadow-md"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-[15px] truncate">
                            {name}
                          </span>
                          <span className="block text-[12px] truncate">
                            {location}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-emerald-700">{isSelected ? 'Ocultar QR' : 'Ver QR'}</span>
                        <QrCode
                          className="h-5 w-5 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        className="min-h-[44px] shrink-0 rounded-xl border border-red-300 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                        aria-label={`Eliminar de este dispositivo: ${name}`}
                        onClick={() =>
                          setOfflineActionMessage('Este QR aún no está guardado en este dispositivo.')
                        }
                      >
                        Eliminar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {offlineActionMessage && <p role="status">{offlineActionMessage}</p>}

            {selectedOfflineId &&
              (() => {
                const selected = offlinePasses.find(
                  (item) => item.id === selectedOfflineId
                );

                if (!selected) return null;

                // Si el pase también llegó del servidor, se abre con la tarjeta completa
                // para poder actualizar el QR guardado; si no, se abre el guardado.
                const fromServer = passes.find((item) => item.id === selected.id);

                return (
                  <div className="pt-2">
                    {fromServer ? (
                      <EventPassQrCard pass={toEventPassDto(fromServer)} backHref="/mis-pases" />
                    ) : (
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
                    )}
                  </div>
                );
              })()}

            {selectedServerId &&
              (() => {
                const selected = serverOnlyPasses.find((item) => item.id === selectedServerId);

                if (!selected) return null;

                return (
                  <div className="pt-2">
                    <EventPassQrCard pass={toEventPassDto(selected)} backHref="/mis-pases" />
                  </div>
                );
              })()}
          </section>

          {passes.length === 0 && offlinePasses.length === 0 && (
            <p>No tienes pases generados actualmente.</p>
          )}
        </div>
      </div>
    </>
  );
}