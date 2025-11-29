import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone number already exists
    const existingPhone = await this.userRepository.findOne({
      where: { phone_number: registerDto.phone },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (registerDto.password) {
      hashedPassword = await bcrypt.hash(registerDto.password, 10);
    }

    // Create new user
    const user = this.userRepository.create({
      email: registerDto.email,
      phone_number: registerDto.phone,
      password: hashedPassword,
      first_name: registerDto.first_name,
      middle_name: registerDto.middle_name,
      last_name: registerDto.last_name,
      email_verified: false,
      phone_verified: false,
    });

    await this.userRepository.save(user);

    // Assign default role (user)
    const defaultRole = await this.roleRepository.findOne({
      where: { name: 'user' },
    });

    if (defaultRole) {
      const userRole = this.userRoleRepository.create({
        user_id: user.id,
        role_id: defaultRole.id,
      });
      await this.userRoleRepository.save(userRole);
    }

    // Send OTP via email
    const { reference, expiresAt } = await this.otpService.sendOTP(
      registerDto.email,
      'registration',
    );

    return {
      message: 'OTP sent to your email for verification',
      reference,
      expires_at: expiresAt.toISOString(),
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    // Verify OTP code
    await this.otpService.verifyOTP(verifyOtpDto.email, verifyOtpDto.code);

    const user = await this.userRepository.findOne({
      where: { email: verifyOtpDto.email },
      relations: ['roles', 'roles.role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Mark email as verified
    user.email_verified = true;
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user_id: user.id,
      phone: user.phone_number,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      profile_picture: user.profile_picture,
      role: user.roles[0]?.role.name || 'user',
      tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      select: ['id', 'email', 'password', 'email_verified', 'is_active', 'is_banned'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.email_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.is_banned) {
      throw new UnauthorizedException('Account is banned');
    }

    // If password is provided, authenticate with password
    if (loginDto.password) {
      if (!user.password) {
        throw new UnauthorizedException(
          'Password login not available for this account. Please use OTP login.',
        );
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Fetch user with relations for token generation
      const fullUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['roles', 'roles.role'],
      });

      if (!fullUser) {
        throw new UnauthorizedException('User not found');
      }

      // Generate tokens
      const tokens = await this.generateTokens(fullUser);

      return {
        user_id: fullUser.id,
        phone: fullUser.phone_number,
        email: fullUser.email,
        full_name: fullUser.full_name,
        first_name: fullUser.first_name,
        middle_name: fullUser.middle_name,
        last_name: fullUser.last_name,
        profile_picture: fullUser.profile_picture,
        role: fullUser.roles[0]?.role.name || 'user',
        tokens,
      };
    }

    // If no password provided, send OTP for login
    const { reference, expiresAt } = await this.otpService.sendOTP(
      loginDto.email,
      'login',
    );

    return {
      message: 'OTP sent to your email',
      reference,
      expires_at: expiresAt.toISOString(),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.refresh_token !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { refresh_token: null });
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: User) {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') || '7d') as any,
    });

    // Store refresh token
    user.refresh_token = refreshToken;
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
    };
  }
}
