"use client";

import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  requestApplicationStatus,
  STATUS_QUERY_GENERIC_MESSAGE,
} from "../services/status-query.service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_ERROR_MESSAGE =
  "No se pudo solicitar el estado en este momento. Inténtalo nuevamente.";

type RequestState = "idle" | "sending" | "sent";

export function StatusQueryForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [message, setMessage] = useState(STATUS_QUERY_GENERIC_MESSAGE);
  const [state, setState] = useState<RequestState>("idle");

  function validateEmail(): string | null {
    const value = email.trim();

    if (!value) return "Ingresa tu correo electrónico";
    if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
      return "Ingresa un correo electrónico válido";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state === "sending") return;

    const validationError = validateEmail();
    setEmailError(validationError);
    setRequestError(null);

    if (validationError) return;

    setState("sending");

    try {
      const responseMessage = await requestApplicationStatus(email);
      setMessage(responseMessage);
      setState("sent");
    } catch {
      setRequestError(REQUEST_ERROR_MESSAGE);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="rounded-lg border border-oatmeal border-l-4 border-l-burning-flame bg-palladian px-4 py-3 text-sm text-abyssal-blue"
        >
          {message}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setState("idle");
              setEmailError(null);
              setRequestError(null);
            }}
            className="font-bold text-abyssal-blue underline underline-offset-4 hover:text-truffle-trouble"
          >
            Consultar otro correo
          </button>

          <Link
            href="/login"
            className="font-bold text-abyssal-blue underline underline-offset-4 hover:text-truffle-trouble"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="status-query-email"
          className="block text-xs font-bold uppercase tracking-wider text-abyssal-blue"
        >
          Correo electrónico
          <span className="text-truffle-trouble"> *</span>
        </label>

        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-abyssal-blue/55"
          />
          <input
            id="status-query-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="alumni.sistemas@umss.edu.bo"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={
              emailError ? "status-query-email-error" : "status-query-email-help"
            }
            className={`w-full rounded-lg border bg-palladian py-3 pl-10 pr-3.5 text-sm text-abyssal-blue outline-none transition focus:border-burning-flame focus:bg-white focus:ring-2 focus:ring-burning-flame/30 ${
              emailError
                ? "border-truffle-trouble ring-2 ring-truffle-trouble"
                : "border-oatmeal"
            }`}
          />
        </div>

        <p
          id="status-query-email-help"
          className="text-xs leading-relaxed text-abyssal-blue/65"
        >
          Usaremos este correo únicamente para enviar la notificación de estado.
          No mostraremos el resultado en esta pantalla.
        </p>

        {emailError && (
          <p
            id="status-query-email-error"
            role="alert"
            className="text-xs text-truffle-trouble"
          >
            {emailError}
          </p>
        )}
      </div>

      {requestError && (
        <p
          role="alert"
          className="rounded-lg bg-truffle-trouble/10 px-3 py-2 text-sm text-truffle-trouble"
        >
          {requestError}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="flex w-full items-center justify-center rounded-lg bg-burning-flame px-4 py-3.5 text-sm font-bold text-abyssal-blue shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "sending" ? "Solicitando..." : "Solicitar estado"}
      </button>

      <div className="flex items-start gap-2.5 rounded-lg border border-oatmeal bg-palladian px-3.5 py-3 text-xs leading-relaxed text-abyssal-blue/75">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-abyssal-blue/60"
        />
        <p>
          Por seguridad, el portal no confirma si el correo tiene una solicitud.
          La información se envía solo a la dirección verificada.
        </p>
      </div>

      <p className="text-center text-xs">
        <Link
          href="/login"
          className="font-bold text-abyssal-blue underline underline-offset-4 hover:text-truffle-trouble"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}