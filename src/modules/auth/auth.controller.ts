import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, OtpSentResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user and send OTP' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: OtpSentResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Phone number already registered' })
  async register(@Body() registerDto: RegisterDto): Promise<OtpSentResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and complete registration' })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, user logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for login' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: OtpSentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'User not found or not verified' })
  async login(@Body() loginDto: LoginDto): Promise<OtpSentResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      phone: user.phone_number,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      profile_picture: user.profile_picture,
      location: user.location,
      address: user.address,
      city: user.city,
      subscription_tier: user.subscription_tier,
      ghana_card_verified: user.ghana_card_verified,
      rating: user.rating,
      total_exchanges: user.total_exchanges,
      created_at: user.created_at,
    };
  }
}
