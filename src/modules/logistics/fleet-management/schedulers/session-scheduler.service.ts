import { Injectable, Logger }   from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsService }      from '../services/sessions.service';

@Injectable()
export class SessionSchedulerService {
  private readonly logger = new Logger(SessionSchedulerService.name);

  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Runs every hour to check for sessions that have been active for too long
   * and marks them as expired
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkForExpiredSessions() {
    this.logger.log('Checking for expired vehicle sessions...');
    try {
      await this.sessionsService.checkForExpiredSessions();
    } catch (error) {
      this.logger.error(`Error checking for expired sessions: ${ error.message }`);
    }
  }
}
