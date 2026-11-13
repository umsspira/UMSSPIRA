
import { useState } from 'react';
import {
  sendChatMessage,
  type SendChatMessageResult,
} from '@/shared/services/chat-message.service';

export const useSendMessage = () => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (
    conversationId: string,
    content: string,
  ): Promise<SendChatMessageResult> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const message = 'Necesitas conexión para enviar mensajes.';

      setError(message);

      return {
        success: false,
        error: message,
      };
    }

    setSending(true);
    setError(null);

    try {
      const result = await sendChatMessage({
        conversationId,
        content,
      });

      if (!result.success) {
        setError(result.error ?? 'Error al enviar el mensaje');
      }

      return result;
    } finally {
      setSending(false);
    }
  };

  return { send, sending, error };
};
