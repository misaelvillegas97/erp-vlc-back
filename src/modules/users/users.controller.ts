import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
}                                                                                         from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiQuery, ApiTags, } from '@nestjs/swagger';
import { AuthGuard }                                                                      from '@nestjs/passport';


import { InfinityPaginationResponse, InfinityPaginationResponseDto, } from '@shared/utils/dto/infinity-pagination-response.dto';
import { NullableType }                                               from '@shared/utils/types/nullable.type';
import { infinityPagination }                                         from '@shared/utils/infinity-pagination';
import { CreateUserDto }                                              from './dto/create-user.dto';
import { QueryUserDto }                                               from './dto/query-user.dto';
import { UpdateUserDto }                                              from './dto/update-user.dto';
import { Roles }                                                      from '../roles/roles.decorator';
import { RoleEnum }                                                   from '../roles/roles.enum';
import { RolesGuard }                                                 from '../roles/roles.guard';
import { User }                                                       from './domain/user';
import { UsersService }                                               from './users.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiCreatedResponse({type: User})
  @SerializeOptions({groups: [ 'admin' ]})
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfileDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createProfileDto);
  }

  @ApiOkResponse({type: InfinityPaginationResponse(User)})
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: QueryUserDto,
  ): Promise<InfinityPaginationResponseDto<User>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) limit = 50;

    return infinityPagination(
      await this.usersService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      {page, limit},
    );
  }

  @ApiOkResponse({type: Array<User>})
  @Get('query')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({groups: [ 'admin' ]})
  @ApiQuery({name: 'query', type: String, required: true})
  async findByQuery(
    @Query('query') query: string,
  ): Promise<User[]> {
    return this.usersService.findByQuery(query);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: [ 'admin' ],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: [ 'admin' ],
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(
    @Param('id') id: User['id'],
    @Body() updateProfileDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.usersService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: User['id']): Promise<void> {
    return this.usersService.remove(id);
  }
}
