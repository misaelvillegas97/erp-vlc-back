import 'dotenv/config';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType, } from '@nestjs/common';
import { ConfigService }                                               from '@nestjs/config';
import { NestFactory, Reflector }                                      from '@nestjs/core';
import { DocumentBuilder, SwaggerModule }                              from '@nestjs/swagger';
import { NestExpressApplication }                                      from '@nestjs/platform-express';

import { useContainer } from 'class-validator';
import compression      from 'compression';
import helmet           from 'helmet';

import { AllConfigType }              from '@core/config/config.type';
import validationOptions              from '@shared/utils/validation-options';
import { ResolvePromisesInterceptor } from '@shared/utils/serializer.interceptor';
import { AppModule }                  from './app.module';
import cookieParser                   from 'cookie-parser';
import { HttpLoggingInterceptor }     from '@core/interceptors/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {cors: true, bufferLogs: true});
  useContainer(app.select(AppModule), {fallbackOnErrors: true});
  const configService = app.get(ConfigService<AllConfigType>);
  const isProduction = configService.get('app.nodeEnv', {infer: true}) === 'production';

  app.enableShutdownHooks();
  // Comment Pino logger while developing
  // app.useLogger(app.get(Logger));
  // app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.setGlobalPrefix('api', {exclude: [ '/' ]},);
  app.enableVersioning({type: VersioningType.URI});
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
    new HttpLoggingInterceptor(new Reflector())
  );


  app.use(cookieParser(configService.get<AllConfigType>('auth.cookieSecret', {infer: true})));
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: isProduction ? undefined : false,
    hidePoweredBy: isProduction,
  }));

  const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  if (configService.get('app.nodeEnv', {infer: true}) === 'production') {
    app.enable('trust proxy', 1);
  }

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  // app.useStaticAssets(path.join(__dirname, '..', 'public'), {prefix: '/public'});

  await app.listen(configService.getOrThrow<AllConfigType>('app.port', {infer: true}), '::');
}

void bootstrap();
