export interface ApiVersionInfo {
  version: string;
  deprecated: boolean;
  sunset?: string;
  supportedVersions: string[];
}
