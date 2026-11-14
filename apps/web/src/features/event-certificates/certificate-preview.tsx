'use client';

import { useEffect, useState } from 'react';

interface CertificatePreviewProps {
  pdf: Blob;
  title: string;
}

export function CertificatePreview({
  pdf,
  title,
}: CertificatePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(pdf);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdf]);

  if (!previewUrl) {
    return (
      <div role="status">
        Preparando vista previa del certificado...
      </div>
    );
  }

  return (
    <object
      data={previewUrl}
      type="application/pdf"
      aria-label={`Vista previa del certificado: ${title}`}
      style={{
        display: 'block',
        width: '100%',
        height: '550px',
        border: '1px solid #d8d1c6',
        borderRadius: '8px',
        background: '#ffffff',
      }}
    >
      <p>
        Tu navegador no puede mostrar la vista previa de este PDF.
        Puedes utilizar el botón de descarga del certificado.
      </p>
    </object>
  );
}
