import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { HubtelOTPProvider } from './providers/hubtel-otp.provider';
import { TermiiOTPProvider } from './providers/termii-otp.provider';
import { MockOTPProvider } from './providers/mock-otp.provider';

@Module({
  imports: [TypeOrmModule.forFeature([OtpVerification])],
  providers: [
    OtpService,
    HubtelOTPProvider,
    TermiiOTPProvider,
    MockOTPProvider,
  ],
  exports: [OtpService],
})
export class OtpModule {}
