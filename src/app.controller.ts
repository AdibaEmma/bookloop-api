import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Deploy healthcheck — public and dependency-free so an auth guard or a
   * slow downstream can never make a healthy app look dead.
   */
  @Get('health')
  @Public()
  health() {
    return { status: 'ok' };
  }
}
