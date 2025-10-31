import { Injectable, ConsoleLogger } from '@nestjs/common';

/**
 * Custom Logger Service using NestJS built-in ConsoleLogger
 *
 * Wraps NestJS ConsoleLogger to provide consistent logging across the application.
 * Supports log levels: log, error, warn, debug, verbose
 */
@Injectable()
export class LoggerService extends ConsoleLogger {
  constructor() {
    super('BookLoop');
  }

  // Override log method to add timestamp and context
  log(message: string, context?: string) {
    super.log(message, context || 'BookLoop');
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context || 'BookLoop');
  }

  warn(message: string, context?: string) {
    super.warn(message, context || 'BookLoop');
  }

  debug(message: string, context?: string) {
    super.debug(message, context || 'BookLoop');
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context || 'BookLoop');
  }
}
