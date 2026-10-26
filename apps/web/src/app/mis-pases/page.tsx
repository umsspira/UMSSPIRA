"use client";

import React, { useEffect, useState } from "react";
// Ruta corregida a la carpeta de componentes compartidos
import { Navbar } from "@/shared/components/navbar";
import { EventPassCard } from "@/modules/events/components/EventPassCard";
import { apiClient } from "@/shared/services/api-client";

interface PassData {
  id: string;
  registrationId: string;
  eventId: string;
  userId: string;
  qrToken: string;
  status: "VALID" | "INVALID" | "ERROR" | "RECOVERED";
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
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
          <p className="font-sans text-[#1B2632] font-semibold">Cargando tus pases...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#EEE9DF] p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="font-serif text-3xl font-bold text-[#1B2632] mb-8">
            Mis Credenciales
          </h1>
          {passes.length === 0 ? (
            <p className="font-sans text-[#1B2632]">No tienes pases generados actualmente.</p>
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