export type ReceiptData = {
  requestNumber?: string;
  fullName: string;
  ci: string;
  documentTypeLabel: string;
  status: string;
  submittedAt: string;
  email: string;
};

const LOGO_URL = '/images/logo-umss.png';

async function loadLogo(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('logo'));
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('logo'));
      image.src = dataUrl;
    });
    return { dataUrl, ...size };
  } catch {
    return null;
  }
}

export async function downloadReceiptPdf(data: ReceiptData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const logo = await loadLogo();
  if (logo) {
    const logoHeight = 18;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    doc.addImage(logo.dataUrl, 'PNG', margin, y, logoWidth, logoHeight);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(102, 89, 76);
  doc.text('UNIVERSIDAD MAYOR DE SAN SIMON', pageWidth - margin, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('UMSS Cochabamba', pageWidth - margin, y + 13, { align: 'right' });

  y += 26;
  doc.setDrawColor(255, 179, 101);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(38, 35, 31);
  doc.text('Constancia de recepción de solicitud', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(101, 87, 75);
  doc.text('Trámite registrado oficialmente', margin, y);

  y += 14;
  const rows: Array<[string, string]> = [];
  if (data.requestNumber) rows.push(['Número de solicitud', data.requestNumber]);
  rows.push(
    ['Nombre del Titulado', data.fullName],
    ['Documento de Identidad (C.I.)', data.ci],
    ['Tipo de trámite', data.documentTypeLabel],
    ['Estado', data.status],
    ['Fecha y hora', data.submittedAt],
    ['Correo electrónico', data.email],
  );

  const valueX = margin + 62;
  const valueWidth = pageWidth - margin - valueX;
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(91, 80, 70);
    doc.text(label, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(41, 38, 33);
    const lines = doc.splitTextToSize(value, valueWidth) as string[];
    doc.text(lines, valueX, y);

    y += Math.max(lines.length, 1) * 5 + 4;
    doc.setDrawColor(233, 226, 215);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 4, pageWidth - margin, y - 4);
  }

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(146, 138, 129);
  const note = doc.splitTextToSize(
    'Esta constancia certifica la recepción de tu solicitud. El resultado y el dictamen de verificación se enviarán a tu correo electrónico.',
    pageWidth - margin * 2,
  ) as string[];
  doc.text(note, margin, y);

  const generatedAt = new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date());
  doc.text(`Documento generado el ${generatedAt}`, margin, 285);

  const safeCi = data.ci.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`constancia-recepcion${safeCi ? `-${safeCi}` : ''}.pdf`);
}