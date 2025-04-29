import { Injectable }           from '@nestjs/common';
import { InjectRepository }     from '@nestjs/typeorm';
import { Repository }           from 'typeorm';
import { NavigationItemEntity } from '@modules/navigation/domain/entities/navigation-item.entity';
import { FeatureToggleEntity }  from '@modules/config/domain/entities/feature-toggle.entity';
import { RoleEntity }           from '@modules/roles/domain/entities/role.entity';
import { NavigationItemType }   from '@modules/navigation/dto/create-navigation-item.dto';

@Injectable()
export class NavigationSeedService {
  constructor(
    @InjectRepository(NavigationItemEntity)
    private navigationItemRepository: Repository<NavigationItemEntity>,
    @InjectRepository(FeatureToggleEntity)
    private featureToggleRepository: Repository<FeatureToggleEntity>,
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
  ) {}

  /**
   * Seed initial navigation items for application startup
   */
  async seed(): Promise<void> {
    const navigationItems = await this.navigationItemRepository.find();

    // Solo sembrar si no existen elementos de navegación
    if (navigationItems.length === 0) {
      await this.seedNavigationItems();
    }
  }

  /**
   * Create initial navigation items with their hierarchical structure
   */
  private async seedNavigationItems(): Promise<void> {
    // Obtener roles para asignar a los elementos de navegación
    const adminRole = await this.roleRepository.findOne({where: {name: 'admin'}});
    const userRole = await this.roleRepository.findOne({where: {name: 'user'}});
    const allRoles = [ adminRole, userRole ].filter(Boolean);

    // Obtener feature toggles para enlazar a los elementos de navegación
    const logisticsToggle = await this.featureToggleRepository.findOne({
      where: {name: 'logistics-module'}
    });

    const operationsToggle = await this.featureToggleRepository.findOne({
      where: {name: 'operations-module'}
    });

    const accountingToggle = await this.featureToggleRepository.findOne({
      where: {name: 'accounting-module'}
    });

    const reportsToggle = await this.featureToggleRepository.findOne({
      where: {name: 'reports'}
    });

    // Crear elementos de navegación padre
    const parentItems = [
      {
        title: 'home',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:home',
        link: '/home',
        roles: []
      },
      {
        title: 'operations.title',
        type: NavigationItemType.COLLAPSABLE,
        icon: 'heroicons_outline:briefcase',
        featureToggle: operationsToggle,
        roles: []
      },
      {
        title: 'logistics.title',
        type: NavigationItemType.COLLAPSABLE,
        icon: 'heroicons_outline:truck',
        featureToggle: logisticsToggle,
        roles: allRoles
      },
      {
        title: 'maintainers.title',
        type: NavigationItemType.COLLAPSABLE,
        icon: 'heroicons_outline:cog',
        roles: [ adminRole ]
      }
    ];

    // Guardar elementos padre
    const savedParents = new Map();
    for (const item of parentItems) {
      const {roles, featureToggle, ...itemData} = item;

      const navigationItem = this.navigationItemRepository.create(itemData);

      if (roles) {
        navigationItem.roles = roles;
      }

      if (featureToggle) {
        navigationItem.featureToggle = featureToggle;
      }

      const saved = await this.navigationItemRepository.save(navigationItem);
      savedParents.set(item.title, saved);
    }

    // Crear elementos secundarios y guardarlos para referencia posterior
    const savedSecondLevel = new Map();

    // Elementos hijos para Operations
    const operationsChildren = [
      {
        title: 'operations.accounting.title',
        type: NavigationItemType.COLLAPSABLE,
        icon: 'heroicons_outline:calculator',
        parentTitle: 'operations.title',
        featureToggle: accountingToggle,
        roles: []
      },
      {
        title: 'operations.orders.title',
        type: NavigationItemType.COLLAPSABLE,
        icon: 'heroicons_outline:shopping-cart',
        parentTitle: 'operations.title',
        roles: []
      },
      {
        title: 'operations.invoices.title',
        type: NavigationItemType.COLLAPSABLE,
        icon: 'heroicons_outline:receipt-tax',
        parentTitle: 'operations.title',
        roles: []
      }
    ];

    // Guardar los hijos de operations
    for (const item of operationsChildren) {
      const {parentTitle, roles, featureToggle, ...itemData} = item;
      const parent = savedParents.get(parentTitle);

      if (parent) {
        const navigationItem = this.navigationItemRepository.create({
          ...itemData,
          parentId: parent.id
        });

        if (roles && roles.length) {
          navigationItem.roles = roles;
        }

        if (featureToggle) {
          navigationItem.featureToggle = featureToggle;
        }

        const saved = await this.navigationItemRepository.save(navigationItem);
        savedSecondLevel.set(item.title, saved);
      }
    }

    // Elementos hijos para Logistics
    const logisticsChildren = [
      {
        title: 'logistics.fleet-control',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:truck',
        link: '/logistics/fleet-control',
        parentTitle: 'logistics.title',
        roles: allRoles
      },
      {
        title: 'logistics.active-sessions',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:user-circle',
        link: '/logistics/active-sessions',
        parentTitle: 'logistics.title',
        roles: allRoles
      },
      {
        title: 'logistics.history',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:clock',
        link: '/logistics/history',
        parentTitle: 'logistics.title',
        roles: allRoles
      }
    ];

    // Guardar los hijos de logistics
    for (const item of logisticsChildren) {
      const {parentTitle, roles, ...itemData} = item;
      const parent = savedParents.get(parentTitle);

      if (parent) {
        const navigationItem = this.navigationItemRepository.create({
          ...itemData,
          parentId: parent.id
        });

        if (roles && roles.length) {
          navigationItem.roles = roles;
        }

        if (itemData['featureToggle']) {
          navigationItem.featureToggle = itemData['featureToggle'];
        }

        await this.navigationItemRepository.save(navigationItem);
      }
    }

    // Elementos hijos para Maintainers
    const maintainersChildren = [
      {
        title: 'maintainers.clients',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:building-storefront',
        link: '/maintainers/clients',
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.suppliers',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:user-group',
        link: '/maintainers/suppliers',
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.products',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:shopping-bag',
        link: '/maintainers/products',
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.users',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:user-group',
        link: '/maintainers/users',
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.payables.title',
        type: NavigationItemType.GROUP,
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.logistics.title',
        type: NavigationItemType.GROUP,
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.settings.title',
        type: NavigationItemType.GROUP,
        parentTitle: 'maintainers.title',
        roles: [ adminRole ]
      }
    ];

    // Guardar los hijos de maintainers
    for (const item of maintainersChildren) {
      const {parentTitle, roles, ...itemData} = item;
      const parent = savedParents.get(parentTitle);

      if (parent) {
        const navigationItem = this.navigationItemRepository.create({
          ...itemData,
          parentId: parent.id
        });

        if (roles && roles.length) {
          navigationItem.roles = roles;
        }

        if (itemData['featureToggle']) {
          navigationItem.featureToggle = itemData['featureToggle'];
        }

        const saved = await this.navigationItemRepository.save(navigationItem);
        savedSecondLevel.set(item.title, saved);
      }
    }

    // ===== TERCER NIVEL - ELEMENTOS NIETOS =====

    // Elementos de tercer nivel para Operations > Accounting
    const accountingChildren = [
      {
        title: 'operations.accounting.dashboard',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:chart-pie',
        link: '/operations/accounting/dashboard',
        parentTitle: 'operations.accounting.title',
        roles: []
      },
      {
        title: 'operations.accounting.payables',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:document-text',
        link: '/operations/accounting/payables/list',
        parentTitle: 'operations.accounting.title',
        roles: []
      },
      {
        title: 'operations.accounting.receivables',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:document-text',
        link: '/operations/accounting/receivables/list',
        parentTitle: 'operations.accounting.title',
        roles: []
      },
      {
        title: 'operations.accounting.bank',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:banknotes',
        link: '/operations/accounting/bank/list',
        parentTitle: 'operations.accounting.title',
        roles: []
      },
      {
        title: 'operations.accounting.reports',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:document-report',
        link: '/operations/accounting/reports',
        parentTitle: 'operations.accounting.title',
        featureToggle: reportsToggle,
        roles: []
      }
    ];

    // Guardar hijos de accounting
    void this.saveThirdLevelItems(accountingChildren, savedSecondLevel);

    // Elementos de tercer nivel para Operations > Orders
    const ordersChildren = [
      {
        title: 'operations.orders.dashboard',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:chart-pie',
        link: '/operations/orders/dashboard',
        parentTitle: 'operations.orders.title',
        roles: []
      },
      {
        title: 'operations.orders.list',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:document-text',
        link: '/operations/orders/list',
        parentTitle: 'operations.orders.title',
        roles: []
      },
      {
        title: 'operations.orders.create',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:plus-circle',
        link: '/operations/orders/new',
        parentTitle: 'operations.orders.title',
        roles: []
      }
    ];

    // Guardar hijos de orders
    void this.saveThirdLevelItems(ordersChildren, savedSecondLevel);

    // Elementos de tercer nivel para Operations > Invoices
    const invoicesChildren = [
      {
        title: 'operations.invoices.dashboard',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:chart-pie',
        link: '/operations/invoices/dashboard',
        parentTitle: 'operations.invoices.title',
        roles: []
      },
      {
        title: 'operations.invoices.list',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:document-text',
        link: '/operations/invoices/list',
        parentTitle: 'operations.invoices.title',
        roles: []
      }
    ];

    // Guardar hijos de invoices
    void this.saveThirdLevelItems(invoicesChildren, savedSecondLevel);

    // Elementos de tercer nivel para Maintainers > Payables
    const payablesChildren = [
      {
        title: 'maintainers.payables.expense-type',
        type: NavigationItemType.BASIC,
        icon: 'mat_outline:label',
        link: '/maintainers/expense-types/list',
        parentTitle: 'maintainers.payables.title',
        roles: [ adminRole ]
      }
    ];

    // Guardar hijos de payables
    void this.saveThirdLevelItems(payablesChildren, savedSecondLevel);

    // Elementos de tercer nivel para Maintainers > Logistics
    const maintLogisticsChildren = [
      {
        title: 'maintainers.logistics.vehicles',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:truck',
        link: '/maintainers/vehicles/list',
        parentTitle: 'maintainers.logistics.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.logistics.drivers',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:user-circle',
        link: '/maintainers/drivers/list',
        parentTitle: 'maintainers.logistics.title',
        roles: [ adminRole ]
      }
    ];

    // Guardar hijos de maintainers logistics
    void this.saveThirdLevelItems(maintLogisticsChildren, savedSecondLevel);

    // Elementos de tercer nivel para Maintainers > Settings
    const settingsChildren = [
      {
        title: 'maintainers.settings.feature-toggles',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:cog',
        link: '/maintainers/feature-toggles/list',
        parentTitle: 'maintainers.settings.title',
        roles: [ adminRole ]
      },
      {
        title: 'maintainers.settings.navigation',
        type: NavigationItemType.BASIC,
        icon: 'heroicons_outline:menu',
        link: '/maintainers/navigation/list',
        parentTitle: 'maintainers.settings.title',
        roles: [ adminRole ]
      }
    ];

    // Guardar hijos de settings
    void this.saveThirdLevelItems(settingsChildren, savedSecondLevel);
  }

  /**
   * Helper method to save third level items
   */
  private async saveThirdLevelItems(items: any[], parentMap: Map<string, any>): Promise<void> {
    for (const item of items) {
      const {parentTitle, roles, featureToggle, ...itemData} = item;
      const parent = parentMap.get(parentTitle);

      if (parent) {
        const navigationItem = this.navigationItemRepository.create({
          ...itemData,
          parentId: parent.id
        } as NavigationItemEntity);

        if (roles && roles.length) {
          navigationItem.roles = roles;
        }

        if (featureToggle) {
          navigationItem.featureToggle = featureToggle;
        }

        await this.navigationItemRepository.save(navigationItem);
      }
    }
  }
}
