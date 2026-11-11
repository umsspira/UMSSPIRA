'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Upload } from 'lucide-react';

import {
  PROFILE_PHOTO_ERROR_MESSAGE,
  PROFILE_PHOTO_MIME_TYPE,
  getProfileInitials,
  isValidProfilePhoto,
} from '@/modules/profile/utils/profile-photo-rules';

type ProfilePhotoSectionProps = {
  // Nombre del titulado para el avatar con iniciales
  name: string;
  // Foto guardada; mientras no exista se muestra el avatar
  currentPhotoUrl?: string | null;
};

export function ProfilePhotoSection({ name, currentPhotoUrl = null }: ProfilePhotoSectionProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Libera la vista previa anterior al cambiarla y al salir de la pantalla
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isValidProfilePhoto(file)) {
      // Archivo rechazado: no queda elegido ni se muestra como vista previa
      setErrorMessage(PROFILE_PHOTO_ERROR_MESSAGE);
      setPreviewUrl(null);
      event.target.value = '';
      return;
    }
    setErrorMessage(null);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const shownPhotoUrl = previewUrl ?? currentPhotoUrl;

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="flex flex-col gap-4 rounded-2xl border border-oatmeal bg-white p-5 sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border border-oatmeal sm:mx-0">
        {shownPhotoUrl ? (
          // La vista previa es una URL local (blob:), por eso se usa img y no next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPhotoUrl}
            alt={previewUrl ? 'Vista previa de la foto de perfil' : 'Foto de perfil actual'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label="Avatar con iniciales"
            className="flex h-full w-full items-center justify-center bg-blue-fantastic text-2xl font-semibold text-white"
          >
            {getProfileInitials(name)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h2 id={`${inputId}-title`} className="text-lg font-semibold text-blue-fantastic">
          Foto de perfil
        </h2>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={PROFILE_PHOTO_MIME_TYPE}
          aria-labelledby={`${inputId}-title`}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={handleFileChange}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-oatmeal bg-white px-4 py-2 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian sm:w-fit"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Elegir archivo
        </button>
        {errorMessage && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1 rounded-md bg-[#FEF2F2] px-2 py-1 text-xs text-[#DC2626]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}