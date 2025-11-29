import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OtpService } from './otp.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpEmailProcessor } from '../../common/queues/otp-email.processor';
import { MailModule } from '../../common/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpVerification]),
    BullModule.registerQueue({
      name: 'otpEmail',
    }),
    MailModule,
  ],
  providers: [OtpService, OtpEmailProcessor],
  exports: [OtpService],
})
export class OtpModule {}
