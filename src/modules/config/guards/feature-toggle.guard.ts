import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector }                                                     from '@nestjs/core';
import { ConfigService }                                                 from '../config.service';
import { FEATURE_TOGGLE_KEY }                                            from '../decorators/feature-toggle.decorator';

@Injectable()
export class FeatureToggleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_TOGGLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no feature toggle is required, allow access
    if (!requiredFeature) {
      return true;
    }

    // Check if the feature toggle is enabled
    const isEnabled = await this.configService.isFeatureEnabled(requiredFeature);

    if (!isEnabled) {
      throw new ForbiddenException(`Feature "${ requiredFeature }" is disabled`);
    }

    return true;
  }
}
