export const tryParseErrorMessage = (responseText: string, fallback?: string): string => {
  const fallbackMessage = fallback ?? 'An unknown error occurred. Please try again later.';
  if (responseText.length === 0) return fallbackMessage;
  try {
    const parsed = JSON.parse(responseText);
    const message = parsed?.message ?? parsed?.error ?? parsed?.errorMessage ?? fallbackMessage;
    if (typeof message === 'string') {
      return message;
    }
    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};
