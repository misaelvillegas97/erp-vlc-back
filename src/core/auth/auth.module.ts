import { Module }             from '@nestjs/common';
import { AuthController }     from './auth.controller';
import { AuthService }        from './auth.service';
import { PassportModule }     from '@nestjs/passport';
import { JwtModule }          from '@nestjs/jwt';
import { JwtStrategy }        from './strategies/jwt.strategy';
import { AnonymousStrategy }  from './strategies/anonymous.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule }        from '@modules/users/users.module';
import { SessionModule }      from '@modules/session/session.module';
import { MailModule }         from '@modules/mail/mail.module';

@Module({
  imports: [
    UsersModule,
    SessionModule,
    PassportModule,
    MailModule,
    JwtModule.register({}),
  ],
  controllers: [ AuthController ],
  providers: [ AuthService, JwtStrategy, JwtRefreshStrategy, AnonymousStrategy ],
  exports: [ AuthService ],
})
export class AuthModule {}
