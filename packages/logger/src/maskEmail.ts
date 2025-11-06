export function maskEmail(email: string | undefined | null): string {
  if (!email?.length) {
    return '';
  }
  if (email.length <= 6) {
    return email;
  }
  const visiblePart = email.substring(0, 6);
  const maskedPart = '*'.repeat(email.length - 6);
  return visiblePart + maskedPart;
}
