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
  Res,
  SerializeOptions,
  UseGuards,
}                                                                                                                    from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, } from '@nestjs/swagger';
import { AuthGuard }                                                                                                 from '@nestjs/passport';
import { Response }                                                                                                  from 'express';
import { DateTime }                                                                                                  from 'luxon';


import { InfinityPaginationResponse, InfinityPaginationResponseDto, } from '@shared/utils/dto/infinity-pagination-response.dto';
import { NullableType }                                               from '@shared/utils/types/nullable.type';
import { infinityPagination }                                         from '@shared/utils/infinity-pagination';
import { CreateUserDto }                                              from './dto/create-user.dto';
import { QueryUserDto }                                               from './dto/query-user.dto';
import { UpdateUserDto }                                              from './dto/update-user.dto';
import { User }                                                       from './domain/user';
import { UsersService }                                               from './users.service';
import { DriverLicenseDto }                                           from '@modules/users/dto/driver-license.dto';
import { ExportFormat, ExportUserDto }                                from './dto/export-user.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
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
  @ApiQuery({name: 'query', type: String, required: true})
  async findByQuery(
    @Query('query') query: string,
  ): Promise<User[]> {
    return this.usersService.findByQuery(query);
  }

  @ApiOkResponse({type: User})
  @SerializeOptions({groups: [ 'admin' ]})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({name: 'id', type: String, required: true})
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({type: User})
  @SerializeOptions({groups: [ 'admin' ]})
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({name: 'id', type: String, required: true})
  update(@Param('id') id: User['id'], @Body() updateProfileDto: UpdateUserDto): Promise<User | null> {
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

  createDriverLicense(@Param('id') id: User['id'], @Body() driverLicenseDto: DriverLicenseDto): Promise<any> {
    return this.usersService.createDriverLicense(id, driverLicenseDto);
  }

  @ApiOperation({summary: 'Export users to different formats'})
  @ApiResponse({status: 200, description: 'Returns the exported file'})
  @ApiQuery({name: 'format', enum: ExportFormat, required: false, description: 'Export format (json, csv, excel)'})
  @Get('export')
  @HttpCode(HttpStatus.OK)
  async exportUsers(
    @Query() query: QueryUserDto,
    @Query() exportOptions: ExportUserDto,
    @Res() res: Response,
  ): Promise<void> {
    const format = exportOptions.format || ExportFormat.EXCEL;
    const buffer = await this.usersService.exportUsers(query, format);

    const dateStr = DateTime.now().toISODate();
    let fileName = `usuarios_${ dateStr }`;
    let contentType = '';

    switch (format) {
      case ExportFormat.JSON:
        fileName += '.json';
        contentType = 'application/json';
        break;
      case ExportFormat.CSV:
        fileName += '.csv';
        contentType = 'text/csv';
        break;
      case ExportFormat.EXCEL:
      default:
        fileName += '.xlsx';
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${ fileName }"`,
      'Content-Length': buffer.byteLength,
    });

    res.end(buffer);
  }
}
