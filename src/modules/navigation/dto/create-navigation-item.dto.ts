import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type }                                                                                  from 'class-transformer';

export enum NavigationItemType {
  ASIDE = 'aside',
  BASIC = 'basic',
  COLLAPSABLE = 'collapsable',
  DIVIDER = 'divider',
  GROUP = 'group',
  SPACER = 'spacer'
}

export class NavigationItemClassesDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  wrapper?: string;
}

export class NavigationItemBadgeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  classes?: string;
}

export class CreateNavigationItemDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsNotEmpty()
  @IsEnum(NavigationItemType)
  type: NavigationItemType;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsString()
  tooltip?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  fragment?: string;

  @IsOptional()
  @IsBoolean()
  preserveFragment?: boolean;

  @IsOptional()
  @IsObject()
  queryParams?: Record<string, any>;

  @IsOptional()
  @IsString()
  queryParamsHandling?: string;

  @IsOptional()
  @IsBoolean()
  externalLink?: boolean;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsBoolean()
  exactMatch?: boolean;

  @IsOptional()
  @IsObject()
  isActiveMatchOptions?: Record<string, any>;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NavigationItemClassesDto)
  classes?: NavigationItemClassesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NavigationItemBadgeDto)
  badge?: NavigationItemBadgeDto;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  featureToggleId?: string;

  @IsOptional()
  @IsUUID(undefined, {each: true})
  roleIds?: string[];
}
