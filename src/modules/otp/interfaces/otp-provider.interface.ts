export interface SendOtpResponse {
  success: boolean;
  reference: string;
  message: string;
  expiresAt: Date;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

export interface IOTPProvider {
  /**
   * Send OTP to phone number
   * @param phone - Phone number in international format (+233...)
   * @param code - 6-digit OTP code
   * @returns Response with reference and expiry
   */
  sendOTP(phone: string, code: string): Promise<SendOtpResponse>;

  /**
   * Get provider name for logging
   */
  getProviderName(): string;
}
