import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpEmailProcessor } from '../../common/queues/otp-email.processor';
import { MailModule } from '../../common/mail/mail.module';
import { IOTPProvider } from './interfaces/otp-provider.interface';
import { ArkeselOTPProvider } from './providers/arkesel-otp.provider';
import { HubtelOTPProvider } from './providers/hubtel-otp.provider';
import { TermiiOTPProvider } from './providers/termii-otp.provider';
import { MockOTPProvider } from './providers/mock-otp.provider';
import { OTP_SMS_PROVIDER } from './otp.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpVerification]),
    BullModule.registerQueue({
      name: 'otpEmail',
    }),
    MailModule,
  ],
  providers: [
    OtpService,
    OtpEmailProcessor,
    {
      provide: OTP_SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IOTPProvider => {
        const provider = (
          config.get<string>('OTP_PROVIDER') || 'mock'
        ).toLowerCase();
        switch (provider) {
          case 'arkesel':
            return new ArkeselOTPProvider(config);
          case 'hubtel':
            return new HubtelOTPProvider(config);
          case 'termii':
            return new TermiiOTPProvider(config);
          case 'mock':
          default:
            return new MockOTPProvider();
        }
      },
    },
  ],
  exports: [OtpService],
})
export class OtpModule {}
