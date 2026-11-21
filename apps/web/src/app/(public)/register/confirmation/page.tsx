import { ConfirmationContent } from '@/modules/documents/frontend/components/confirmation-content';

export const metadata = {
  title: 'Solicitud enviada',
};

export default function ConfirmationPage() {
  return (
    <main className="flex flex-1 items-center bg-palladian px-4 py-10">
      <ConfirmationContent />
    </main>
  );
}
