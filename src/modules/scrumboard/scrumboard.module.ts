import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule }     from '@nestjs/jwt';
import { UsersModule }   from '@modules/users/users.module';

import { BoardController }   from './controllers/board.controller';
import { CardController }    from './controllers/card.controller';
import { ListController }    from './controllers/list.controller';
import { CardEntity }        from './entities/card.entity';
import { BoardEntity }       from './entities/board.entity';
import { LabelEntity }       from './entities/label.entity';
import { ListEntity }        from './entities/list.entity';
import { BoardMemberEntity } from './entities/board-member.entity';
import { BoardGateway }      from './gateways/board.gateway';
import { BoardService }      from './services/board.service';
import { CardService }       from './services/card.service';
import { ListService }       from './services/list.service';
import { MemberService }     from './services/member.service';
import { LabelService }      from './services/label.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BoardEntity,
      ListEntity,
      CardEntity,
      LabelEntity,
      BoardMemberEntity
    ]),
    UsersModule,
    JwtModule.register({})
  ],
  controllers: [
    BoardController,
    CardController,
    ListController
  ],
  providers: [
    BoardService,
    CardService,
    ListService,
    MemberService,
    LabelService,
    BoardGateway
  ],
})
export class ScrumboardModule {}
