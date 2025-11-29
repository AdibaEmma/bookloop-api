import { MailerService } from '@nestjs-modules/mailer';
import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailConfig } from '../config/mail.config';
import { ConfigService } from '@nestjs/config';

export interface OtpEmailJob {
  email: string;
  code: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'email_verification';
}

@Processor('otpEmail')
export class OtpEmailProcessor {
  private readonly logger = new Logger(OtpEmailProcessor.name);

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  @Process('send')
  async handleSendOtpEmail(job: Job<OtpEmailJob>) {
    this.logger.debug('Processing OTP email...');
    const { email, code, purpose } = job.data;

    try {
      await this.mailerService.sendMail({
        from: MailConfig.getFromAddress(this.configService),
        to: email,
        subject: this.getSubject(purpose),
        template: 'otp-verification',
        context: {
          details: {
            code,
            year: new Date().getFullYear(),
          },
        },
      });

      this.logger.log(`OTP email sent successfully to ${email}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send OTP email to ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private getSubject(
    purpose: 'registration' | 'login' | 'password_reset' | 'email_verification',
  ): string {
    switch (purpose) {
      case 'registration':
        return 'Complete Your BookLoop Registration';
      case 'login':
        return 'Your BookLoop Login Code';
      case 'password_reset':
        return 'Reset Your BookLoop Password';
      case 'email_verification':
        return 'Verify Your BookLoop Email';
      default:
        return 'Your BookLoop Verification Code';
    }
  }
}
