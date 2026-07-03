/**
 * DI token for the active SMS OTP provider. The provider is chosen at boot
 * from OTP_PROVIDER (arkesel | hubtel | termii | mock). Only the selected
 * provider is constructed, so unused providers never touch their (possibly
 * missing) credentials. Defaults to `mock`, which logs the code to the console
 * — so local dev works without an SMS account.
 */
export const OTP_SMS_PROVIDER = 'OTP_SMS_PROVIDER';
