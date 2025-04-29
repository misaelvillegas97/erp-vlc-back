import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                                          from '@shared/domain/entities/abstract.entity';
import { RoleEntity }                                                              from '@modules/roles/domain/entities/role.entity';
import { FeatureToggleEntity }                                                     from '@modules/config/domain/entities/feature-toggle.entity';

/**
 * Navigation item entity for application menu structure
 * Based on FuseNavigationItem interface from frontend
 */
@Entity('navigation_items')
export class NavigationItemEntity extends AbstractEntity {
  @Column({type: 'varchar', length: 255})
  title: string;

  @Column({type: 'varchar', length: 255, nullable: true})
  subtitle?: string;

  @Column({type: 'varchar', length: 50})
  type: 'aside' | 'basic' | 'collapsable' | 'divider' | 'group' | 'spacer';

  @Column({type: 'boolean', default: false})
  active?: boolean;

  @Column({type: 'boolean', default: false})
  disabled?: boolean;

  @Column({type: 'varchar', length: 255, nullable: true})
  tooltip?: string;

  @Column({type: 'varchar', length: 255, nullable: true})
  link?: string;

  @Column({type: 'varchar', length: 255, nullable: true})
  fragment?: string;

  @Column({type: 'boolean', default: false, nullable: true})
  preserveFragment?: boolean;

  @Column({type: 'json', nullable: true})
  queryParams?: Record<string, any>;

  @Column({type: 'varchar', length: 50, nullable: true})
  queryParamsHandling?: string;

  @Column({type: 'boolean', default: false, nullable: true})
  externalLink?: boolean;

  @Column({type: 'varchar', length: 50, nullable: true})
  target?: '_blank' | '_self' | '_parent' | '_top' | string;

  @Column({type: 'boolean', default: false, nullable: true})
  exactMatch?: boolean;

  @Column({type: 'json', nullable: true})
  isActiveMatchOptions?: Record<string, any>;

  @Column({type: 'varchar', length: 255, nullable: true})
  icon?: string;

  @Column({type: 'json', nullable: true})
  classes?: {
    title?: string;
    subtitle?: string;
    icon?: string;
    wrapper?: string;
  };

  @Column({type: 'json', nullable: true})
  badge?: {
    title?: string;
    classes?: string;
  };

  @Column({type: 'json', nullable: true})
  meta?: Record<string, any>;

  // Parent-child relationship for hierarchical navigation
  @Column({type: 'uuid', nullable: true, name: 'parent_id'})
  parentId?: string;

  @ManyToOne(() => NavigationItemEntity, item => item.children, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'parent_id'})
  parent?: NavigationItemEntity;

  @OneToMany(() => NavigationItemEntity, item => item.parent)
  children?: NavigationItemEntity[];

  // Feature toggle relationship - if toggle is disabled, navigation item should not be shown
  @Column({type: 'uuid', nullable: true, name: 'feature_toggle_id'})
  featureToggleId?: string;

  @ManyToOne(() => FeatureToggleEntity)
  @JoinColumn({name: 'feature_toggle_id'})
  featureToggle?: FeatureToggleEntity;

  // Role relationship - navigation items can be restricted to specific roles
  @ManyToMany(() => RoleEntity)
  @JoinTable({
    name: 'navigation_item_roles',
    joinColumn: {name: 'navigation_item_id', referencedColumnName: 'id'},
    inverseJoinColumn: {name: 'role_id', referencedColumnName: 'id'}
  })
  roles?: RoleEntity[];
}
