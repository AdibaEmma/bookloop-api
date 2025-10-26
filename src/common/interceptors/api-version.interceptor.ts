import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiVersionInfo } from '../types/api-version.types';

@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  private readonly supportedVersions = ['v1', 'v2'];
  private readonly currentVersion = 'v1';
  private readonly deprecatedVersions = new Map<
    string,
    { sunset: string; replacement: string }
  >([
    // Example: ['v0', { sunset: '2025-12-31', replacement: 'v1' }]
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract version from URL path or header
    const urlVersion = this.extractVersionFromUrl(request.url);
    const headerVersion =
      request.headers['api-version'] || request.headers['x-api-version'];

    const requestedVersion =
      urlVersion || headerVersion || this.currentVersion;

    // Validate version
    if (!this.isVersionSupported(requestedVersion)) {
      throw new BadRequestException({
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: this.supportedVersions,
        currentVersion: this.currentVersion,
      });
    }

    // Check for deprecated version
    const deprecationInfo = this.deprecatedVersions.get(requestedVersion);
    if (deprecationInfo) {
      response.setHeader('X-API-Deprecated', 'true');
      response.setHeader('X-API-Sunset', deprecationInfo.sunset);
      response.setHeader('X-API-Replacement', deprecationInfo.replacement);
      response.setHeader(
        'Warning',
        `299 - "API version ${requestedVersion} is deprecated. Please migrate to ${deprecationInfo.replacement} before ${deprecationInfo.sunset}"`,
      );
    }

    // Add version info to request for controllers to access
    request.apiVersion = requestedVersion;

    // Add version headers to response
    response.setHeader('X-API-Version', requestedVersion);
    response.setHeader(
      'X-API-Supported-Versions',
      this.supportedVersions.join(', '),
    );

    return next.handle().pipe(
      map((data) => {
        // Add version info to response body
        if (data && typeof data === 'object') {
          return {
            ...data,
            _meta: {
              ...data._meta,
              apiVersion: requestedVersion,
              timestamp: new Date().toISOString(),
            },
          };
        }
        return data;
      }),
    );
  }

  /**
   * Extract version from URL path (e.g., /api/v1/users -> v1)
   */
  private extractVersionFromUrl(url: string): string | null {
    const versionMatch = url.match(/\/api\/(v\d+)\//);
    return versionMatch ? versionMatch[1] : null;
  }

  /**
   * Check if version is supported
   */
  private isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  /**
   * Get version information for a specific version
   */
  getVersionInfo(version: string): ApiVersionInfo | null {
    if (!this.isVersionSupported(version)) {
      return null;
    }

    const deprecationInfo = this.deprecatedVersions.get(version);

    return {
      version,
      deprecated: !!deprecationInfo,
      sunset: deprecationInfo?.sunset,
      supportedVersions: this.supportedVersions,
    };
  }

  /**
   * Get all supported versions with their info
   */
  getAllVersionsInfo(): ApiVersionInfo[] {
    return this.supportedVersions.map((version) => ({
      version,
      deprecated: this.deprecatedVersions.has(version),
      sunset: this.deprecatedVersions.get(version)?.sunset,
      supportedVersions: this.supportedVersions,
    }));
  }
}
