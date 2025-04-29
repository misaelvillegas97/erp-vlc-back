import { Exclude, Expose, Type } from 'class-transformer';
import { NavigationItemEntity }  from '../domain/entities/navigation-item.entity';
import { RoleEntity }            from '@modules/roles/domain/entities/role.entity';

export class NavigationItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  subtitle?: string;

  @Expose()
  type: string;

  @Expose()
  active?: boolean;

  @Expose()
  disabled?: boolean;

  @Expose()
  tooltip?: string;

  @Expose()
  link?: string;

  @Expose()
  fragment?: string;

  @Expose()
  preserveFragment?: boolean;

  @Expose()
  queryParams?: Record<string, any>;

  @Expose()
  queryParamsHandling?: string;

  @Expose()
  externalLink?: boolean;

  @Expose()
  target?: string;

  @Expose()
  exactMatch?: boolean;

  @Expose()
  isActiveMatchOptions?: Record<string, any>;

  @Expose()
  icon?: string;

  @Expose()
  classes?: {
    title?: string;
    subtitle?: string;
    icon?: string;
    wrapper?: string;
  };

  @Expose()
  badge?: {
    title?: string;
    classes?: string;
  };

  @Expose()
  meta?: Record<string, any>;

  @Expose()
  @Type(() => NavigationItemResponseDto)
  children?: NavigationItemResponseDto[];

  @Exclude()
  featureToggle?: any;

  @Exclude()
  roles?: RoleEntity[];

  constructor(partial: Partial<NavigationItemEntity>) {
    Object.assign(this, partial);
  }

  /**
   * Filter navigation items based on feature toggles and user roles
   * @param items Navigation items to filter
   * @param userRoleIds User role IDs
   * @returns Filtered navigation items
   */
  static filterByRolesAndToggles(
    items: NavigationItemEntity[],
    userRoleIds: number[] = []
  ): NavigationItemResponseDto[] {
    if (!items || items.length === 0) {
      return [];
    }

    return items
      .filter(item => {
        // Filter by feature toggle - if toggle exists and is disabled, filter out
        if (item.featureToggle && !item.featureToggle.enabled) {
          return false;
        }

        // Filter by roles - if roles exist and user doesn't have any of them, filter out
        if (item.roles && item.roles.length > 0) {
          if (!userRoleIds || userRoleIds.length === 0) {
            return false;
          }

          // Check if user has at least one of the required roles
          return item.roles.some(role => userRoleIds.includes(role.id));
        }

        // If no restrictions, include the item
        return true;
      })
      .map(item => {
        const dto = new NavigationItemResponseDto(item);

        // Process children recursively
        if (item.children && item.children.length > 0) {
          dto.children = this.filterByRolesAndToggles(item.children, userRoleIds);
        }

        return dto;
      });
  }
}
