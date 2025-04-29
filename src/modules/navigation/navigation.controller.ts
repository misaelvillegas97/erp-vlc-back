import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags }                 from '@nestjs/swagger';
import { NavigationService }                                                 from './navigation.service';
import { CreateNavigationItemDto }                                           from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto }                                           from './dto/update-navigation-item.dto';
import { AuthGuard }                                                         from '@nestjs/passport';
import { RolesGuard }                                                        from '@modules/roles/roles.guard';
import { Roles }                                                             from '@modules/roles/roles.decorator';
import { RoleEnum }                                                          from '@modules/roles/roles.enum';

@ApiTags('navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiBearerAuth()
  @ApiOperation({summary: 'Create a new navigation item'})
  @ApiResponse({status: 201, description: 'The navigation item has been successfully created.'})
  async create(@Body() createNavigationItemDto: CreateNavigationItemDto) {
    return this.navigationService.create(createNavigationItemDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get all navigation items filtered by user roles and feature toggles'})
  @ApiResponse({status: 200, description: 'Return navigation items filtered by user roles and feature toggles'})
  async findAll(@Req() req) {
    // Get user roles from request
    const userRoleIds = req.user?.roles?.map(role => role.id) || [];
    return this.navigationService.getNavigationForUser(userRoleIds);
  }

  @Get('hierarchy')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get all navigation items in a hierarchy'})
  @ApiResponse({status: 200, description: 'Return all navigation items in a hierarchy'})
  async findAllHierarchy(@Req() req) {
    const nav = await this.navigationService.getHierarchy();

    return nav;
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get all navigation items (admin)'})
  @ApiResponse({status: 200, description: 'Return all navigation items'})
  async findAllAdmin() {
    return this.navigationService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get a navigation item by ID'})
  @ApiResponse({status: 200, description: 'Return the navigation item'})
  @ApiResponse({status: 404, description: 'Navigation item not found'})
  async findOne(@Param('id') id: string) {
    return this.navigationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiBearerAuth()
  @ApiOperation({summary: 'Update a navigation item'})
  @ApiResponse({status: 200, description: 'The navigation item has been successfully updated.'})
  @ApiResponse({status: 404, description: 'Navigation item not found'})
  async update(
    @Param('id') id: string,
    @Body() updateNavigationItemDto: UpdateNavigationItemDto,
  ) {
    return this.navigationService.update(id, updateNavigationItemDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiBearerAuth()
  @ApiOperation({summary: 'Delete a navigation item'})
  @ApiResponse({status: 200, description: 'The navigation item has been successfully deleted.'})
  @ApiResponse({status: 404, description: 'Navigation item not found'})
  async remove(@Param('id') id: string) {
    await this.navigationService.remove(id);
    return {success: true};
  }
}
