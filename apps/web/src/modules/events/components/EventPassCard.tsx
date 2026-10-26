"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

// Tipos basados en tus Criterios de Aceptación y backend (Añadido "ACTIVO")
type PassStatus = "VALID" | "ACTIVO" | "INVALID" | "ERROR" | "RECOVERED";

interface EventPassProps {
  status: PassStatus | string;
  eventName: string;
  userName?: string;
  dateTime?: string;
  location?: string;
  passId?: string;
  qrToken?: string;
  onBack: () => void;
  onRetry?: () => void;
}

export const EventPassCard: React.FC<EventPassProps> = ({
  status,
  eventName,
  userName,
  dateTime,
  location,
  passId,
  qrToken,
  onBack,
  onRetry,
}) => {
  // Configuraciones visuales según el estado
  const isError = status === "ERROR";
  const isInvalid = status === "INVALID" || status === "INVALIDADO" || status === "VENCIDO";
  const isRecovered = status === "RECOVERED";
  
  // AQUÍ ESTÁ LA CORRECCIÓN CLAVE: Acepta "ACTIVO" como válido
  const isValid = status === "VALID" || status === "ACTIVO" || isRecovered;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-lg border border-[#C9C1B1] font-sans">
      
      {/* COLUMNA IZQUIERDA (40%) - Oscura */}
      <div className="md:w-[40%] bg-[#2C3B4D] p-8 flex flex-col items-center justify-center text-center relative">
        {/* Logo/Header Interno */}
        <div className="absolute top-8 left-8 text-left">
          <h3 className="text-white font-serif font-bold text-xl tracking-wider">UMSSPIRA</h3>
          <p className="text-[#FFB162] text-[10px] font-semibold tracking-widest uppercase mt-1">Pase de evento</p>
        </div>

        <div className="mt-16 mb-8 flex flex-col items-center">
          {/* Mostrar QR si es válido */}
          {isValid && qrToken && (
            <div className="bg-[#EEE9DF] p-3 rounded-xl">
              <QRCodeSVG value={qrToken} size={160} fgColor="#1B2632" bgColor="#EEE9DF" />
            </div>
          )}

          {/* Mostrar estado difuminado/inválido */}
          {isInvalid && (
            <div className="relative bg-[#2C3B4D] border-4 border-dashed border-[#C9C1B1]/30 w-[160px] h-[160px] rounded-xl flex items-center justify-center">
               <div className="bg-[#A35139] text-white text-sm font-bold py-2 px-6 rounded-md z-10">
                 NO VÁLIDO
               </div>
            </div>
          )}

          {/* Mostrar alerta de error */}
          {isError && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#FFB162] flex items-center justify-center text-[#FFB162] text-3xl mb-4">
                !
              </div>
              <h4 className="text-white font-serif text-xl">QR pendiente</h4>
            </div>
          )}

          {/* Mostrar éxito en recuperación */}
          {isRecovered && (
             <div className="flex flex-col items-center mt-4">
               <div className="w-12 h-12 rounded-full border-2 border-[#FFB162] flex items-center justify-center text-[#FFB162] text-xl mb-2">
                 ✓
               </div>
               <p className="text-white text-sm">Sin duplicados</p>
             </div>
          )}
        </div>

        {/* Badges y código inferior de la columna izquierda */}
        {!isError && (
          <>
            <div className={`mt-auto text-xs font-bold py-1 px-4 rounded-full ${isInvalid ? 'hidden' : 'bg-[#EEE9DF] text-[#1B2632]'}`}>
               VÁLIDO
            </div>
            {passId && (
              <div className="mt-4 text-left w-full">
                <p className="text-[#C9C1B1] text-[10px] uppercase">ID Pase</p>
                <p className="text-white text-xs font-mono">{passId}</p>
              </div>
            )}
          </>
        )}
        {isError && (
           <div className="mt-auto bg-[#EEE9DF] text-[#1B2632] text-[11px] font-bold py-1 px-4 rounded-full uppercase">
             Inscripción Confirmada
           </div>
        )}
      </div>

      {/* COLUMNA DERECHA (60%) - Clara */}
      <div className="md:w-[60%] bg-[#EEE9DF] p-8 md:p-12 flex flex-col justify-center">
        <h1 className="font-serif font-bold text-3xl text-[#1B2632] mb-4">
          {eventName}
        </h1>
        
        {/* Badge de estado de inscripción */}
        {!isError && !isRecovered && (
          <div className="inline-block bg-[#C9C1B1]/50 border border-[#C9C1B1] text-[#1B2632] text-xs font-bold py-1 px-3 rounded-full mb-8 w-fit">
            {isInvalid ? 'EVENTO CANCELADO' : 'INSCRIPCIÓN CONFIRMADA'}
          </div>
        )}

        {/* Mensajes específicos por estado */}
        {isInvalid && (
          <p className="text-[#1B2632] text-sm mt-4 mb-12">
            Este pase fue invalidado porque el evento ya no está activo.
          </p>
        )}

        {isError && (
          <div className="mt-4">
            <p className="text-[#A35139] text-sm font-medium mb-6">
              No se pudo generar el código QR en este momento.
            </p>
            <div className="border border-[#A35139] bg-[#A35139]/10 p-4 rounded-lg text-center mb-8">
              <p className="text-[#A35139] text-xs font-medium">
                No se crearon pases duplicados ni inconsistentes. Puedes reintentar de forma segura.
              </p>
            </div>
          </div>
        )}

        {isRecovered && (
           <div className="mt-4 mb-8">
             <p className="text-[#1B2632] text-sm font-medium mb-4">
               Ya existía un pase vigente para esta inscripción.
             </p>
             <div className="border border-[#C9C1B1] bg-[#C9C1B1]/30 p-6 rounded-lg text-center">
               <p className="text-[#1B2632] text-sm font-medium">
                 El sistema recuperó el mismo pase y conservó su identificador original.
               </p>
             </div>
           </div>
        )}

        {/* Datos del evento (Solo visibles si es válido) */}
        {isValid && !isRecovered && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] text-[#2C3B4D]/60 uppercase font-semibold">Titulado</p>
              <p className="text-[#1B2632] text-sm font-medium">{userName}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#2C3B4D]/60 uppercase font-semibold">Fecha y hora</p>
              <p className="text-[#1B2632] text-sm font-medium">{dateTime}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#2C3B4D]/60 uppercase font-semibold">Ubicación</p>
              <p className="text-[#1B2632] text-sm font-medium">{location}</p>
            </div>
            <hr className="border-[#C9C1B1] my-4" />
            <p className="text-[11px] text-[#1B2632]/80 leading-relaxed">
              Este QR es único para tu inscripción. No compartas tu identificador de pase.
            </p>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="mt-auto pt-8 flex gap-4">
          <button 
            onClick={onBack}
            className="flex-1 md:flex-none h-[44px] px-[24px] rounded-[8px] bg-transparent border border-[#C9C1B1] text-[#1B2632] font-sans font-semibold text-[14px] transition-colors hover:bg-[#C9C1B1]/20"
          >
            {isError ? 'Volver a mis eventos' : 'Volver a mis pases'}
          </button>
          
          {isError && (
            <button 
              onClick={onRetry}
              className="flex-1 md:flex-none h-[44px] px-[24px] rounded-[8px] bg-[#FFB162] text-[#1B2632] font-sans font-semibold text-[14px] transition-opacity hover:opacity-90"
            >
              Reintentar
            </button>
          )}

          {isRecovered && (
             <button 
             className="flex-1 md:flex-none h-[44px] px-[24px] rounded-[8px] bg-[#FFB162] text-[#1B2632] font-sans font-semibold text-[14px] transition-opacity hover:opacity-90"
           >
             Abrir pase
           </button>
          )}
        </div>
      </div>
    </div>
  );
};