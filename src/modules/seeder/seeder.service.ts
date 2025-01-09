import { Injectable }    from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@core/config/config.type';

@Injectable()
export class SeederService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>
  ) {}

  appInfo() {
    return {name: this.configService.get('app.name', {infer: true})};
  }
}
