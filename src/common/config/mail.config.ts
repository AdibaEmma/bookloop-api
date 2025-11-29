import { ConfigService } from '@nestjs/config';
import * as path from 'path';

export class MailConfig {
  static getMailerConfig(configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV');
    const fromName = configService.get<string>('SMTP_FROM_NAME') || 'BookLoop';
    const fromEmail =
      configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@bookloop.com';

    if (nodeEnv === 'production') {
      // SendGrid configuration for production
      return {
        transport: {
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: configService.getOrThrow<string>('SENDGRID_API_KEY'),
          },
        },
        defaults: {
          from: `"${fromName}" <${fromEmail}>`,
        },
        template: {
          dir: path.join(__dirname, '..', 'mails', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      };
    } else {
      // Mailtrap configuration for development/testing
      return {
        transport: {
          host:
            configService.get<string>('SMTP_HOST') ||
            'sandbox.smtp.mailtrap.io',
          port: parseInt(configService.get<string>('SMTP_PORT') || '2525'),
          secure: false,
          auth: {
            user: configService.getOrThrow<string>('SMTP_USER'),
            pass: configService.getOrThrow<string>('SMTP_PASSWORD'),
          },
        },
        defaults: {
          from: `"${fromName}" <${fromEmail}>`,
        },
        template: {
          dir: path.join(__dirname, '..', 'mails', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      };
    }
  }

  static getFromAddress(configService?: ConfigService): string {
    if (!configService) {
      return 'noreply@bookloop.com';
    }
    const fromName = configService.get<string>('SMTP_FROM_NAME') || 'BookLoop';
    const fromEmail =
      configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@bookloop.com';
    return `"${fromName}" <${fromEmail}>`;
  }
}

// Handlebars adapter import (will be used by MailerModule)
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
