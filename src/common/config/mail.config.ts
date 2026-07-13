import { ConfigService } from '@nestjs/config';
import * as path from 'path';

export class MailConfig {
  static getMailerConfig(configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV');
    const fromName = configService.get<string>('SMTP_FROM_NAME') || 'BookLoop';
    const fromEmail =
      configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@bookloop.com';

    // One env-driven transport for every environment. Dev defaults to
    // Mailtrap's sandbox; production must be configured explicitly with any
    // SMTP relay (Resend, SendGrid, SES...). SENDGRID_API_KEY remains an
    // accepted alias: it implies SendGrid's fixed host and "apikey" user.
    const sendgridKey = configService.get<string>('SENDGRID_API_KEY');
    const host =
      configService.get<string>('SMTP_HOST') ||
      (sendgridKey ? 'smtp.sendgrid.net' : 'sandbox.smtp.mailtrap.io');
    const port = parseInt(
      configService.get<string>('SMTP_PORT') || (sendgridKey ? '587' : '2525'),
    );
    const user =
      configService.get<string>('SMTP_USER') || (sendgridKey ? 'apikey' : undefined);
    const pass = configService.get<string>('SMTP_PASSWORD') || sendgridKey;

    if (nodeEnv === 'production' && (!user || !pass)) {
      // Fail loud and actionable — but only when mail is truly unconfigured.
      throw new Error(
        'Mail transport not configured: set SMTP_HOST/SMTP_USER/SMTP_PASSWORD (or SENDGRID_API_KEY) in the environment.',
      );
    }

    return {
      transport: {
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
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
