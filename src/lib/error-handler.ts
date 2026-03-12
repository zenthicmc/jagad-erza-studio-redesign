import { AxiosError } from "axios";
import toast from "react-hot-toast";

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;
  const rawCode = data?.error || data?.message;
  if (!rawCode || typeof rawCode !== "string") {
    return null;
  }

  return rawCode.toLowerCase().replace(/\s+/g, "_");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;

    if (data?.errors) {
      const firstField = Object.keys(data.errors)[0];
      if (firstField && data.errors[firstField]?.length > 0) {
        return data.errors[firstField][0];
      }
    }

    if (data?.message) {
      return data.message;
    }

    if (error.response?.status) {
      const statusMessages: Record<number, string> = {
        400: "Bad request",
        401: "Unauthorized. Please log in again.",
        403: "You don't have permission to perform this action.",
        404: "Resource not found.",
        422: "Invalid data provided.",
        429: "Too many requests. Please try again later.",
        500: "Server error. Please try again later.",
      };

      return statusMessages[error.response.status] || "Something went wrong.";
    }

    if (error.code === "ERR_NETWORK") {
      return "Network error. Please check your connection.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export function handleApiError(error: unknown): void {
  const message = getErrorMessage(error);
  toast.error(message);
}

export function parseValidationErrors(
  error: unknown,
): Record<string, string> | null {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data?.errors) {
      const parsed: Record<string, string> = {};
      for (const [field, messages] of Object.entries(data.errors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          parsed[field] = messages[0] as string;
        }
      }
      return parsed;
    }
  }
  return null;
}

type SetErrorFn = (
  name: any,
  error: { type?: string; message: string },
) => void;

type TranslatorFn = (key: string) => string;

const snakeToCamel = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const extractBaseFieldName = (field: string): string => {
  const match = field.match(/^([a-zA-Z_]+)(\[\d+\])?$/);
  return match ? match[1] : field;
};

const resolveFieldName = (
  backendField: string,
  fieldMap: Record<string, string> = {},
): string => {
  if (fieldMap[backendField]) return fieldMap[backendField];

  const baseFieldName = extractBaseFieldName(backendField);
  if (baseFieldName !== backendField && fieldMap[baseFieldName]) {
    return fieldMap[baseFieldName];
  }

  return snakeToCamel(baseFieldName);
};

interface WsValidationError {
  field?: string;
  message?: string;
  key?: string;
  description?: string;
}

/**
 * Handle validation errors received via WebSocket.
 * Maps backend field names to form field names and sets react-hook-form errors.
 */
export function handleWsValidationErrors(
  errors: WsValidationError | WsValidationError[],
  options: {
    setError: SetErrorFn;
    t: TranslatorFn;
    fieldMap?: Record<string, string>;
  },
): void {
  const { setError, t, fieldMap = {} } = options;
  const list = Array.isArray(errors) ? errors : [errors];

  list.forEach((err) => {
    if (err.field && err.message) {
      const formField = resolveFieldName(err.field, fieldMap);
      if (formField) {
        setError(formField, {
          type: "server",
          message: t(`ValidationError.${err.message}`),
        });
      } else {
        toast.error(t(`ValidationError.${err.message}`) || err.message);
      }
    } else if (err.key) {
      const formField = resolveFieldName(snakeToCamel(err.key), fieldMap);
      if (formField) {
        setError(formField, {
          type: "server",
          message: err.description || "Validation Error",
        });
      } else {
        toast.error(err.description || "Validation Error");
      }
    }
  });
}

/**
 * Handle API errors with form field mapping (for Axios errors).
 * Maps validation errors to form fields and common errors to specific fields or shows toast.
 */
export function handleFormApiError(
  error: unknown,
  options: {
    setError: SetErrorFn;
    t: TranslatorFn;
    fieldMap?: Record<string, string>;
    commonErrorFieldMap?: Record<string, string>;
    onUnhandled?: (errorKey: string) => void;
  },
): void {
  if (!(error instanceof AxiosError)) return;

  const responseData = error.response?.data;
  if (!responseData) return;

  // 422 validation errors
  if (responseData.errors && Array.isArray(responseData.errors)) {
    responseData.errors.forEach((err: { field: string; message: string }) => {
      const formField = resolveFieldName(err.field, options.fieldMap || {});
      if (formField) {
        options.setError(formField, {
          type: "server",
          message: options.t(`ValidationError.${err.message}`),
        });
      } else {
        toast.error(options.t(`ValidationError.${err.message}`) || err.message);
      }
    });
  }

  const commonErrorKey = responseData.error || responseData.message;
  if (commonErrorKey && typeof commonErrorKey === "string") {
    const defaultFieldMap: Record<string, string> = {
      email_exists: "email",
      user_not_registered: "email",
      email_verified: "email",
      email_not_verified: "email",
      invalid_credentials: "password",
      password_incorrect: "password",
      same_password: "password",
    };

    const merged = {
      ...defaultFieldMap,
      ...(options.commonErrorFieldMap || {}),
    };
    const targetField = merged[commonErrorKey];

    if (targetField) {
      options.setError(targetField, {
        type: "server",
        message: options.t(`ErrorMessageResponse.${commonErrorKey}`),
      });
    } else if (typeof options.onUnhandled === "function") {
      options.onUnhandled(commonErrorKey);
    } else {
      toast.error(
        options.t(`ErrorMessageResponse.${commonErrorKey}`) || commonErrorKey,
      );
    }
  }
}
