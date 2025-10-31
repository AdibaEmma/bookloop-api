import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Paystack from 'paystack-node';
import { Payment, PaymentStatus, PaymentProvider, PaymentPurpose } from './entities/payment.entity';
import { Subscription, SubscriptionTier } from './entities/subscription.entity';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { LoggerService } from '../../common/logger/logger.service';

// Subscription pricing in GHS (Ghana Cedis)
const SUBSCRIPTION_PRICES = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.BASIC]: 10, // GHS 10/month
  [SubscriptionTier.PREMIUM]: 25, // GHS 25/month
};

// Subscription limits
const SUBSCRIPTION_LIMITS = {
  [SubscriptionTier.FREE]: { listings: 3, radius: 10 },
  [SubscriptionTier.BASIC]: { listings: 10, radius: 25 },
  [SubscriptionTier.PREMIUM]: { listings: -1, radius: 50 }, // -1 = unlimited
};

@Injectable()
export class PaymentsService {
  private paystack: any;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    const paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!paystackSecretKey) {
      this.logger.warn('Paystack secret key not configured. Payment functionality will be limited.');
    } else {
      this.paystack = new Paystack(paystackSecretKey);
      this.logger.log('Paystack SDK initialized successfully');
    }
  }

  /**
   * Initialize payment with Paystack
   */
  async initializePayment(userId: string, dto: InitializePaymentDto, email: string) {
    if (!this.paystack) {
      throw new InternalServerErrorException('Payment provider not configured');
    }

    // Validate purpose-specific requirements
    if (dto.purpose === PaymentPurpose.EXCHANGE && !dto.exchange_id) {
      throw new BadRequestException('exchange_id is required for exchange payments');
    }

    if (dto.purpose === PaymentPurpose.SUBSCRIPTION && !dto.subscription_id) {
      throw new BadRequestException('subscription_id is required for subscription payments');
    }

    // Generate unique reference
    const reference = `BL_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create payment record
    const payment = this.paymentRepository.create({
      user_id: userId,
      exchange_id: dto.exchange_id,
      subscription_id: dto.subscription_id,
      purpose: dto.purpose,
      amount: dto.amount,
      method: dto.method,
      status: PaymentStatus.PENDING,
      reference,
      provider: PaymentProvider.PAYSTACK,
      metadata: {
        email,
        purpose: dto.purpose,
      },
    });

    await this.paymentRepository.save(payment);

    try {
      // Initialize Paystack transaction
      const response = await this.paystack.transaction.initialize({
        email,
        amount: Math.round(dto.amount * 100), // Convert to pesewas (kobo)
        reference,
        callback_url: this.configService.get<string>('PAYSTACK_CALLBACK_URL'),
        metadata: {
          user_id: userId,
          payment_id: payment.id,
          purpose: dto.purpose,
        },
      });

      if (response.status && response.data) {
        payment.provider_reference = response.data.reference;
        await this.paymentRepository.save(payment);

        this.logger.log(`Payment initialized: ${reference} for user ${userId}`);

        return {
          payment_id: payment.id,
          reference,
          authorization_url: response.data.authorization_url,
          access_code: response.data.access_code,
        };
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failure_reason = 'Failed to initialize Paystack transaction';
        await this.paymentRepository.save(payment);

        throw new InternalServerErrorException('Failed to initialize payment');
      }
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.failure_reason = error.message;
      await this.paymentRepository.save(payment);

      this.logger.error('Failed to initialize payment', error.stack);
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(reference: string) {
    if (!this.paystack) {
      throw new InternalServerErrorException('Payment provider not configured');
    }

    const payment = await this.paymentRepository.findOne({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        status: 'success',
        message: 'Payment already verified',
        payment,
      };
    }

    try {
      const response = await this.paystack.transaction.verify({ reference });

      if (response.status && response.data) {
        const { status, amount } = response.data;

        // Update payment status
        if (status === 'success') {
          payment.status = PaymentStatus.SUCCESS;
          payment.verified_at = new Date();

          // Verify amount matches
          const expectedAmount = Math.round(payment.amount * 100);
          if (amount !== expectedAmount) {
            this.logger.warn(
              `Payment amount mismatch: expected ${expectedAmount}, got ${amount}`,
            );
          }
        } else {
          payment.status = PaymentStatus.FAILED;
          payment.failure_reason = `Paystack status: ${status}`;
        }

        await this.paymentRepository.save(payment);

        this.logger.log(`Payment verified: ${reference} - Status: ${payment.status}`);

        return {
          status: payment.status,
          message: payment.status === PaymentStatus.SUCCESS ? 'Payment successful' : 'Payment failed',
          payment,
        };
      } else {
        throw new InternalServerErrorException('Invalid response from Paystack');
      }
    } catch (error) {
      this.logger.error('Failed to verify payment', error.stack);
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  /**
   * Handle Paystack webhook
   */
  async handlePaystackWebhook(payload: any) {
    const { event, data } = payload;

    this.logger.log(`Received Paystack webhook: ${event}`);

    if (event === 'charge.success') {
      const reference = data.reference;

      const payment = await this.paymentRepository.findOne({
        where: { reference },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for webhook: ${reference}`);
        return;
      }

      if (payment.status !== PaymentStatus.SUCCESS) {
        payment.status = PaymentStatus.SUCCESS;
        payment.verified_at = new Date();
        payment.metadata = { ...payment.metadata, webhook_data: data };
        await this.paymentRepository.save(payment);

        this.logger.log(`Payment updated via webhook: ${reference}`);
      }
    }
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string, limit = 20, offset = 0) {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: payments,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(userId: string, paymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, user_id: userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Create or get user subscription
   */
  async getOrCreateSubscription(userId: string) {
    let subscription = await this.subscriptionRepository.findOne({
      where: { user_id: userId },
    });

    if (!subscription) {
      // Create free tier subscription
      subscription = this.subscriptionRepository.create({
        user_id: userId,
        tier: SubscriptionTier.FREE,
        starts_at: new Date(),
        expires_at: new Date('2099-12-31'), // Free tier never expires
        auto_renew: false,
        active_listings_count: 0,
        is_active: true,
      });

      await this.subscriptionRepository.save(subscription);
      this.logger.log(`Created free subscription for user ${userId}`);
    }

    return subscription;
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(userId: string, dto: UpgradeSubscriptionDto) {
    // Verify payment
    const verificationResult = await this.verifyPayment(dto.payment_reference);

    if (verificationResult.status !== 'success') {
      throw new BadRequestException('Payment verification failed');
    }

    const payment = verificationResult.payment;

    if (payment.purpose !== PaymentPurpose.SUBSCRIPTION) {
      throw new BadRequestException('Invalid payment purpose');
    }

    // Get or create subscription
    const subscription = await this.getOrCreateSubscription(userId);

    // Update subscription
    subscription.tier = dto.tier;
    subscription.starts_at = new Date();
    subscription.expires_at = this.calculateExpiryDate(dto.tier);
    subscription.is_active = true;

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Upgraded subscription for user ${userId} to ${dto.tier}`);

    return subscription;
  }

  /**
   * Get current subscription
   */
  async getCurrentSubscription(userId: string) {
    return this.getOrCreateSubscription(userId);
  }

  /**
   * Cancel subscription (downgrade to free)
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);

    subscription.tier = SubscriptionTier.FREE;
    subscription.auto_renew = false;
    subscription.expires_at = new Date('2099-12-31');

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Cancelled subscription for user ${userId}`);

    return {
      message: 'Subscription cancelled successfully. Downgraded to free tier.',
      subscription,
    };
  }

  /**
   * Get subscription plans
   */
  getSubscriptionPlans() {
    return [
      {
        tier: SubscriptionTier.FREE,
        name: 'Free',
        price: SUBSCRIPTION_PRICES[SubscriptionTier.FREE],
        limits: SUBSCRIPTION_LIMITS[SubscriptionTier.FREE],
        features: [
          'Up to 3 active listings',
          '10km search radius',
          'Basic exchange features',
        ],
      },
      {
        tier: SubscriptionTier.BASIC,
        name: 'Basic',
        price: SUBSCRIPTION_PRICES[SubscriptionTier.BASIC],
        limits: SUBSCRIPTION_LIMITS[SubscriptionTier.BASIC],
        features: [
          'Up to 10 active listings',
          '25km search radius',
          'Priority support',
          'Exchange statistics',
        ],
      },
      {
        tier: SubscriptionTier.PREMIUM,
        name: 'Premium',
        price: SUBSCRIPTION_PRICES[SubscriptionTier.PREMIUM],
        limits: SUBSCRIPTION_LIMITS[SubscriptionTier.PREMIUM],
        features: [
          'Unlimited active listings',
          '50km search radius',
          '24/7 Priority support',
          'Advanced analytics',
          'Featured listings',
          'Verified badge',
        ],
      },
    ];
  }

  /**
   * Check if user can create more listings
   */
  async canCreateListing(userId: string): Promise<boolean> {
    const subscription = await this.getOrCreateSubscription(userId);
    const limit = SUBSCRIPTION_LIMITS[subscription.tier].listings;

    if (limit === -1) {
      return true; // Unlimited
    }

    return subscription.active_listings_count < limit;
  }

  /**
   * Increment active listings count
   */
  async incrementListingsCount(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    subscription.active_listings_count += 1;
    await this.subscriptionRepository.save(subscription);
  }

  /**
   * Decrement active listings count
   */
  async decrementListingsCount(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    if (subscription.active_listings_count > 0) {
      subscription.active_listings_count -= 1;
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Calculate subscription expiry date (1 month from now)
   */
  private calculateExpiryDate(tier: SubscriptionTier): Date {
    if (tier === SubscriptionTier.FREE) {
      return new Date('2099-12-31');
    }

    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + 1);
    return expiry;
  }
}
