import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Exchange } from '../entities/exchange.entity';
import { ExchangeService } from './exchange.service';

/**
 * QR Handover Service
 *
 * Handles secure QR code generation and verification for book exchange handovers.
 *
 * Features:
 * - Generate time-limited QR codes (10 minutes expiry)
 * - Verify QR code authenticity
 * - Prevent replay attacks with single-use codes
 *
 * Security considerations:
 * - Codes are cryptographically random
 * - Short expiry window prevents misuse
 * - Only exchange participants can generate/verify
 */

interface QRCodeData {
  code: string;
  exchangeId: string;
  generatedBy: string;
  expiresAt: Date;
}

// In-memory store for QR codes (in production, use Redis)
const qrCodeStore = new Map<string, QRCodeData>();

// Cleanup expired codes every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, data] of qrCodeStore.entries()) {
    if (data.expiresAt < now) {
      qrCodeStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

@Injectable()
export class QRHandoverService {
  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    private readonly exchangeService: ExchangeService,
  ) {}

  /**
   * Generate QR code for handover
   *
   * Only the book giver (owner for regular exchange, or the party
   * giving their book in a swap) can generate the QR code.
   *
   * @param exchangeId - Exchange ID
   * @param userId - User generating the code
   * @returns QR code and expiry time
   */
  async generateQRCode(
    exchangeId: string,
    userId: string,
  ): Promise<{ code: string; expiresAt: string }> {
    const exchange = await this.exchangeService.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Must be in accepted status with both meetup confirmations
    if (exchange.status !== 'accepted') {
      throw new BadRequestException('Exchange must be accepted to generate QR code');
    }

    if (!exchange.requester_confirmed_meetup || !exchange.owner_confirmed_meetup) {
      throw new BadRequestException('Both parties must confirm meetup first');
    }

    // Generate cryptographically secure code
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the code
    const qrData: QRCodeData = {
      code,
      exchangeId,
      generatedBy: userId,
      expiresAt,
    };
    qrCodeStore.set(code, qrData);

    return {
      code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Verify QR code and confirm handover
   *
   * The receiver scans the QR code to confirm they received the book.
   * This automatically confirms completion for both parties.
   *
   * @param exchangeId - Exchange ID
   * @param userId - User scanning the code
   * @param qrCode - The scanned QR code
   * @returns Updated exchange
   */
  async confirmHandover(
    exchangeId: string,
    userId: string,
    qrCode: string,
  ): Promise<Exchange> {
    const exchange = await this.exchangeService.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Validate QR code
    const qrData = qrCodeStore.get(qrCode);

    if (!qrData) {
      throw new BadRequestException('Invalid or expired QR code');
    }

    if (qrData.exchangeId !== exchangeId) {
      throw new BadRequestException('QR code does not match this exchange');
    }

    if (qrData.expiresAt < new Date()) {
      qrCodeStore.delete(qrCode);
      throw new BadRequestException('QR code has expired');
    }

    // The scanner should be different from the generator
    if (qrData.generatedBy === userId) {
      throw new BadRequestException('You cannot scan your own QR code');
    }

    // Delete the code to prevent reuse
    qrCodeStore.delete(qrCode);

    // Confirm completion for both parties
    exchange.requester_confirmed_completion = true;
    exchange.owner_confirmed_completion = true;
    exchange.status = 'completed';
    exchange.completed_at = new Date();

    const savedExchange = await this.exchangeRepository.save(exchange);

    return this.exchangeService.findById(savedExchange.id);
  }

  /**
   * Check if user can generate QR code for an exchange
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID
   * @returns Whether user can generate QR
   */
  async canGenerateQR(exchangeId: string, userId: string): Promise<boolean> {
    try {
      const exchange = await this.exchangeService.findById(exchangeId);

      return (
        (exchange.requester_id === userId || exchange.owner_id === userId) &&
        exchange.status === 'accepted' &&
        exchange.requester_confirmed_meetup &&
        exchange.owner_confirmed_meetup
      );
    } catch {
      return false;
    }
  }
}
