import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './services/user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import {
  UserResponseDto,
  PublicProfileDto,
} from './dto/user-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

/**
 * UserController
 *
 * Handles user profile management endpoints.
 *
 * Authentication:
 * - All endpoints require JWT authentication (via global JwtAuthGuard)
 * - Current user extracted via @CurrentUser() decorator
 *
 * API Design:
 * - RESTful patterns
 * - Consistent response format via ResponseInterceptor
 * - Swagger documentation for all endpoints
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current user profile
   *
   * GET /users/me
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    const fullUser = await this.userService.findById(user.id);
    return fullUser as UserResponseDto;
  }

  /**
   * Update current user profile
   *
   * PATCH /users/me
   */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.userService.updateProfile(
      user.id,
      updateProfileDto,
    );
    return updatedUser as UserResponseDto;
  }

  /**
   * Update current user location
   *
   * PATCH /users/me/location
   */
  @Patch('me/location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid coordinates',
  })
  async updateLocation(
    @CurrentUser() user: User,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.userService.updateLocation(
      user.id,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
      updateLocationDto.address,
      updateLocationDto.city,
      updateLocationDto.region,
    );
    return updatedUser as UserResponseDto;
  }

  /**
   * Upload profile picture
   *
   * POST /users/me/avatar
   */
  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPG, PNG, WebP)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture uploaded successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or size',
  })
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.userService.uploadProfilePicture(
      user.id,
      file.buffer,
    );
    return updatedUser as UserResponseDto;
  }

  /**
   * Delete profile picture
   *
   * DELETE /users/me/avatar
   */
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete profile picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile picture deleted successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No profile picture to delete',
  })
  async deleteAvatar(@CurrentUser() user: User): Promise<UserResponseDto> {
    const updatedUser = await this.userService.deleteProfilePicture(user.id);
    return updatedUser as UserResponseDto;
  }

  /**
   * Get user karma score
   *
   * GET /users/me/karma
   */
  @Get('me/karma')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user karma score' })
  @ApiResponse({
    status: 200,
    description: 'Karma score retrieved',
    schema: {
      type: 'object',
      properties: {
        karma_score: {
          type: 'number',
          description: 'Karma score (0-100)',
          example: 75,
        },
      },
    },
  })
  async getKarmaScore(
    @CurrentUser() user: User,
  ): Promise<{ karma_score: number }> {
    const karmaScore = await this.userService.calculateKarmaScore(user.id);
    return { karma_score: karmaScore };
  }

  /**
   * Get public profile of another user
   *
   * GET /users/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public profile of a user' })
  @ApiResponse({
    status: 200,
    description: 'Public profile retrieved',
    type: PublicProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getPublicProfile(
    @Param('id') userId: string,
  ): Promise<PublicProfileDto> {
    const profile = await this.userService.getPublicProfile(userId);
    return profile as PublicProfileDto;
  }

  /**
   * Deactivate current user account
   *
   * POST /users/me/deactivate
   */
  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Account deactivated successfully',
        },
      },
    },
  })
  async deactivateAccount(
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.userService.deactivateAccount(user.id);
    return { message: 'Account deactivated successfully' };
  }

  /**
   * Reactivate current user account
   *
   * POST /users/me/reactivate
   */
  @Post('me/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user account' })
  @ApiResponse({
    status: 200,
    description: 'Account reactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Account reactivated successfully',
        },
      },
    },
  })
  async reactivateAccount(
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.userService.reactivateAccount(user.id);
    return { message: 'Account reactivated successfully' };
  }
}
