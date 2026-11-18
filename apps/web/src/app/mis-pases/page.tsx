

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/shared/components/navbar";
import { EventPassCard } from "@/modules/events/components/EventPassCard";
import { apiClient, ApiError } from "@/shared/services/api-client";
import type { EventPassDto } from "@umsspira/shared-types";
import {
  getCurrentUser,
} from "@/modules/auth/frontend/services/auth.service";
import {
  getMyEventPasses,
} from "@/features/event-passes/event-passes-service";
import {
  getOfflineQrPasses,
  getOfflineQrPass,
  saveOfflineQrPass,
} from "@/features/event-passes/offline/offline-qr-storage";
import {
  getOfflineQrUserId,
  saveOfflineQrUserId,
} from "@/features/event-passes/offline/offline-qr-identity";

function formatEventDate(value?: string): string {
  if (!value) return "Fecha por definir";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha por definir";
  }

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(date);
}

export default function MyPassesPage() {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [savedPassIds, setSavedPassIds] = useState<string[]>([]);
  const [savingPassIds, setSavingPassIds] = useState<string[]>([]);
  const [saveMessages, setSaveMessages] = useState<Record<string, string>>({});

  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOfflinePasses() {
      const userId = getOfflineQrUserId();

      if (!userId) {
        throw new Error(
          "No se encontró una identidad local para recuperar tus pases.",
        );
      }

      const savedPasses = await getOfflineQrPasses(userId);

      if (controller.signal.aborted) return;

      const offlinePasses: EventPassDto[] = savedPasses.map((savedPass) => ({
        id: savedPass.id,
        registrationId: "",
        eventId: "",
        userId: savedPass.userId,
        qrToken: savedPass.qrToken,
        status: "ACTIVO",
        isValidForAccess: true,
        issuedAt: savedPass.savedAt,
        expiresAt: null,
        eventDetails: savedPass.eventDetails,
      }));

      setPasses(offlinePasses);
      setIsOffline(true);
      setLoading(false);
      setErrorMessage("");
    }

    async function loadPasses() {
      setLoading(true);
      setErrorMessage("");
      setPasses([]);

      try {
        if (!navigator.onLine) {
          await loadOfflinePasses();
          return;
        }

        let currentUser;

        try {
          currentUser = await getCurrentUser();
        } catch (error) {
          if (error instanceof ApiError && error.status === 0) {
            await loadOfflinePasses();
            return;
          }
          throw error;
        }

        if (controller.signal.aborted) return;

        if (!currentUser?.id) {
          throw new Error("No se pudo verificar tu identidad.");
        }

        saveOfflineQrUserId(currentUser.id);

        let result: EventPassDto[];

        try {
          result = await getMyEventPasses(controller.signal);
        } catch (error) {
          if (error instanceof ApiError && error.status === 0) {
            await loadOfflinePasses();
            return;
          }
          throw error;
        }

        if (controller.signal.aborted) return;

        if (!Array.isArray(result)) {
          throw new Error("La respuesta del servidor no es válida.");
        }

        setPasses(result);
        setIsOffline(false);
        setLoading(false);

        const savedIds: string[] = [];

        for (const pass of result) {
          if (!pass.id || !pass.userId) continue;

          try {
            const saved = await getOfflineQrPass(pass.id, pass.userId);
            if (saved) savedIds.push(pass.id);
          } catch {
            // Se mantiene disponible la opción de guardar.
          }
        }

        if (!controller.signal.aborted) {
          setSavedPassIds(savedIds);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar tus pases.",
        );
        setLoading(false);
      }
    }

    function handleConnectionChange() {
      setRetryCount((value) => value + 1);
    }

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    void loadPasses();

    return () => {
      controller.abort();
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, [retryCount]);

  async function handleSaveOffline(pass: EventPassDto) {
    const details = pass.eventDetails;

    if (
      !details ||
      !pass.id?.trim() ||
      !pass.userId?.trim() ||
      !pass.qrToken?.trim() ||
      !details.name?.trim() ||
      !details.userName?.trim() ||
      !details.dateTime?.trim() ||
      !details.location?.trim()
    ) {
      setSaveMessages((previous) => ({
        ...previous,
        [pass.id]: "No se puede guardar: faltan datos del pase o del evento.",
      }));
      return;
    }

    setSavingPassIds((previous) => [...previous, pass.id]);
    setSaveMessages((previous) => ({ ...previous, [pass.id]: "" }));

    try {
      await saveOfflineQrPass({
        id: pass.id,
        userId: pass.userId,
        qrToken: pass.qrToken,
        eventDetails: {
          name: details.name,
          userName: details.userName,
          dateTime: details.dateTime,
          location: details.location,
        },
      });

      setSavedPassIds((previous) =>
        previous.includes(pass.id) ? previous : [...previous, pass.id],
      );

      setSaveMessages((previous) => ({
        ...previous,
        [pass.id]: "Tu pase QR se guardó en este dispositivo.",
      }));
    } catch (error) {
      setSaveMessages((previous) => ({
        ...previous,
        [pass.id]:
          error instanceof Error
            ? `${error.message} Puedes intentarlo nuevamente.`
            : "No se pudo guardar el pase. Inténtalo nuevamente.",
      }));
    } finally {
      setSavingPassIds((previous) =>
        previous.filter((id) => id !== pass.id),
      );
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-palladian">
          <p className="font-sans text-abyssal-blue font-semibold text-[14px]">
            Cargando tus pases...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-palladian p-4 md:p-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="font-sans font-bold text-[32px] leading-[40px] text-abyssal-blue mb-8">
            Mis Credenciales
          </h1>

          {errorMessage && (
            <div className="text-abyssal-blue text-[14px]" role="alert">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 underline font-semibold"
              >
                Reintentar
              </button>
            </div>
          )}

          {!errorMessage && passes.length === 0 && (
            <p className="font-sans text-abyssal-blue text-[14px]">
              {isOffline
                ? "No hay pases guardados para consultar sin conexión."
                : "No tienes pases generados actualmente."}
            </p>
          )}

          {isOffline && passes.length > 0 && (
            <p
              className="font-sans text-abyssal-blue text-[13px] font-semibold"
              role="status"
            >
              Estás sin conexión. La vigencia de estos pases no está verificada.
            </p>
          )}

          {passes.map((pass) => {
            const isValid =
              pass.status === "ACTIVO" && pass.isValidForAccess;

            return (
              <EventPassCard
                key={pass.id}
                status={
                  isOffline
                    ? "ACTIVO"
                    : isValid
                      ? "ACTIVO"
                      : "INVALID"
                }
                statusLabel={
                  isOffline
                    ? "VIGENCIA NO VERIFICADA"
                    : isValid
                      ? "PASE ACTIVO"
                      : "PASE NO HABILITADO"
                }
                statusDescription={
                  isOffline
                    ? "No se puede verificar la vigencia de este pase sin conexión."
                    : "Este pase no está habilitado para acceder al evento."
                }
                offlineUnverified={isOffline}
                eventName={pass.eventDetails?.name || "Evento UMSSPIRA"}
                userName={pass.eventDetails?.userName || "Titulado"}
                dateTime={formatEventDate(pass.eventDetails?.dateTime)}
                location={pass.eventDetails?.location || "Campus UMSS"}
                passId={pass.id.split("-").pop()}
                qrToken={
                  isOffline || isValid ? pass.qrToken : undefined
                }
                onBack={() => window.history.back()}
                onRetry={retry}
                onSaveOffline={
                  !isOffline && isValid
                    ? () => void handleSaveOffline(pass)
                    : undefined
                }
                isSavedOffline={savedPassIds.includes(pass.id)}
                isSavingOffline={savingPassIds.includes(pass.id)}
                saveOfflineMessage={saveMessages[pass.id]}
              />
            );
          })}
        </div>

import { ConnectedNavbar } from '@/shared/components/navbar/index';
import MyQrPassesPage from '@/features/event-passes/my-qr-passes-page';
import '@/app/(dashboard)/events/events.css';

export default function MyPassesPage() {
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <MyQrPassesPage passesHref="/mis-pases" />

      </div>
    </>
  );
}
