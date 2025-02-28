import { Injectable, Logger }            from '@nestjs/common';
import * as fs                           from 'fs-extra';
import { ConfigService }                 from '@nestjs/config';
import puppeteer                         from 'puppeteer-extra';
import StealthPlugin                     from 'puppeteer-extra-plugin-stealth';
import { Browser, executablePath, Page } from 'puppeteer';
import { Environment }                   from '@core/config/app.config';
import { AllConfigType }                 from '@core/config/config.type';
import { Solver }                        from '@2captcha/captcha-solver';

export interface Order {
  rowNumber: number;
  orderNumber: string;
  businessUnit: string;
  orderType: string;
  status: string;
  deliveryLocation: string;
  emissionDate: Date;
  deliveryDate: Date;
  requestedAmount: number;
  inDispatchAmount: number;
  receivedAmount: number;
  pendingAmount: number;
}

export interface OrderRequest {
  position: number;
  productCode: string;
  providerCode: string;
  description: string;
  barcode: string;
  UMC: string;
  UMBxUMC: number;
  finalCost: number;
  discount: number;
  requestedQty: number;
  inDispatchQty: number;
  receivedQty: number;
  pendingQty: number;
}

@Injectable()
export class CencosudB2bService {
  readonly logger = new Logger(CencosudB2bService.name);
  readonly username: string;
  readonly password: string;
  readonly url: string;
  readonly environment: Environment;
  readonly captchaSolverApiKey: string;
  readonly siteKey: string;

  private configFileBackup: any;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.logger.log('CencosudB2bService initialized');

    this.username = this.configService.get<string>('cencosud.username', {infer: true});
    this.password = this.configService.get<string>('cencosud.password', {infer: true});
    this.url = this.configService.get<string>('cencosud.url', {infer: true});

    this.environment = this.configService.get('app.nodeEnv', {infer: true});

    this.captchaSolverApiKey = this.configService.get<string>('ac.captchaSolver', {infer: true});
    this.siteKey = '6LcVYtEUAAAAALlg52jHvKf9IM8n2FvJfqHSyqxg';
  }

  async run(maxTries = 3) {
    if (maxTries <= 0) {
      this.logger.error('Max retries reached. Aborting operation.');
      throw new Error('Max retries reached');
    }

    puppeteer.use(StealthPlugin());

    const browser: Browser = await puppeteer.launch({
      headless: true,
      args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu' ],
      executablePath: this.environment === Environment.Development ? executablePath() : '/usr/bin/google-chrome',
    });

    const page: Page = await browser.newPage();

    // Set the viewport to 1920x1080
    await page.setViewport({width: 1920, height: 1080});

    try {
      // try access to main page
      const orders = await this.loadMainPage(browser, page);

      const pages = await browser.pages();
      await Promise.all(pages.map((page) => page.close()));

      await browser.close();

      return orders;
    } catch (error) {
      this.logger.error('Error loading main page, clearing cookies and retrying');
      this.logger.error(error.message);

      await browser.close();

      return this.run(maxTries - 1);
    }
  }

  private async loadMainPage(browser: Browser, page: Page) {
    this.logger.log(`Loading main page. ${ this.url }`);
    await page.goto(this.url, {waitUntil: 'networkidle0'});

    // Check if was redirected to login page
    if (page.url().includes('/auth')) {
      this.logger.log('Redirected to login page. Logging in...');

      const loggedIn = await this.login(page);

      if (!loggedIn) return;
    }

    // Get purchase orders
    const orders = await this.getPurchaseOrders(page);

    await browser.close();

    return orders;
  }

  private async getPurchaseOrders(page: Page) {
    this.logger.log('Getting purchase orders');

    await this.checkAnnouncements(page);

    // Navigate to purchase orders, must click at logistic nav menu, then purchase orders from the dropdown
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    this.logger.log('Navigating to purchase orders');

    // Wait for the main menu to load
    await page.waitForSelector('.v-menubar-menuitem'); // Selector del menú principal

    // Click in the "Logística" menu item
    await page.evaluate(async () => {
      const logisticaMenuItem = Array.from(document.querySelectorAll('.v-menubar-menuitem')).find((item) => item.textContent.includes('Logística'));

      await new Promise((resolve) => setTimeout(resolve, 3_000));

      if (logisticaMenuItem) (logisticaMenuItem as HTMLElement).click();
    });

    // Wait for the submenu to load
    await page.waitForSelector('.v-menubar-menuitem');

    // Click in the "Órdenes de Compra" menu item
    await page.evaluate(async () => {
      const ordenesCompraItem = Array.from(document.querySelectorAll('.v-menubar-menuitem')).find((item) => item.textContent.includes('Órdenes de Compra'));

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (ordenesCompraItem) (ordenesCompraItem as HTMLElement).click();
    });

    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // Click in button "Generar informe"
    await page.evaluate(() => {
      const generarInformeButton = document.querySelector('.v-button-btn-filter-search') as HTMLButtonElement;
      if (generarInformeButton) generarInformeButton.click();
    });

    // Give time to generate the report
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    await page.waitForFunction(
      (selector, className) => {
        const element = document.querySelector(selector);
        return element && !element.classList.contains(className);
      },
      {}, // Opciones para waitForFunction
      '.v-grid.v-widget.report-grid.v-grid-report-grid.v-has-width.v-has-height', // Selector
      'v-disabled', // Clase que esperas eliminar
    );

    return await this.extractPurchaseOrders(page);
  }

  private async extractPurchaseOrders(page: Page) {
    this.logger.log('Extracting purchase orders');

    // Esperar a que la tabla se cargue
    await page.waitForSelector('.v-grid-tablewrapper');

    // Extraer datos de la tabla
    const rows = await page.$$('.v-grid-body .v-grid-row');
    const tableData = [];

    for (const row of rows) {
      const cells = await row.$$('.v-grid-cell');
      this.logger.log(`Extracting orden ${ await cells[1].evaluate((node) => node.textContent.trim()) } row ${ rows.indexOf(row) + 1 } of ${ rows.length }`);
      const rowInfo = [];

      for (const cell of cells) {
        const cellText = await cell.evaluate((node) => node.textContent.trim());
        rowInfo.push(cellText);
      }

      // Double-click on the row to open the modal
      if (cells.length >= 1) {
        await cells[1].click({count: 2});
      }

      await page.waitForSelector('.v-window .v-grid-tablewrapper', {visible: true});

      // Leave some time for the modal detail to load
      await new Promise((resolve) => setTimeout(resolve, 5_000));

      const modalTableData = await page.evaluate(() => {
        const table = document.querySelector('.v-window .v-grid-tablewrapper');

        if (!table) return [];

        const rows = Array.from(table.querySelectorAll('.v-grid-body .v-grid-row'));
        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll('.v-grid-cell'));
          return cells.map((cell) => cell.textContent.trim());
        });
      });

      await this.closeModal(page);

      tableData.push(
        this.mapTableData({
          rowInfo,
          orderDetails: modalTableData,
        }),
      );
    }

    return tableData;
  }

  private mapTableData(data: any) {
    const rowHeaders = [ 'rowNumber', 'orderNumber', 'businessUnit', 'orderType', 'status', 'deliveryLocation', 'emissionDate', 'deliveryDate', 'requestedAmount', 'inDispatchAmount', 'receivedAmount', 'pendingAmount' ];

    const orderHeaders = [ 'position', 'productCode', 'providerCode', 'description', 'barcode', 'UMC', 'UMBxUMC', 'finalCost', 'discount', 'requestedQty', 'inDispatchQty', 'receivedQty', 'pendingQty' ];

    const rowInfoObject = Object.fromEntries(rowHeaders.map((key, index) => [ key, data.rowInfo[index] ])) as Order;

    const orderDetailsArray = data.orderDetails.map((detail) => Object.fromEntries(orderHeaders.map((key, index) => [ key, detail[index] ]))) as OrderRequest[];

    return {
      order: rowInfoObject,
      orderDetails: orderDetailsArray,
    };
  }

  private async closeModal(page: any, retries: number = 3): Promise<void> {
    // Attempt to close the modal
    await page.evaluate(() => {
      const closeButton: HTMLDivElement = document.querySelector('.v-window-closebox');
      if (closeButton) closeButton.click();
    });

    // Await to close the modal
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // Check if the modal is still open
    const modalIsOpen = await page.evaluate(() => {
      const modal = document.querySelector('.v-window .v-grid-tablewrapper');
      return modal !== null;
    });

    if (modalIsOpen && retries > 0) {
      console.log(`Modal is still open. Retries left: ${ retries }`);
      // Wait before trying to close again
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      // Recursive call with decremented retries
      await this.closeModal(page, retries - 1);
    } else if (!modalIsOpen) {
    } else {
      this.logger.error('Max retries reached. Modal could not be closed.');
    }
  }

  private async checkAnnouncements(page: Page) {
    // If there is any announcement, close it, div must have aria-relevant attribute
    const announcementExists = await page.evaluate(() => {
      const announcement = document.querySelector('div[aria-relevant]');
      return announcement !== null;
    });

    if (announcementExists) {
      this.logger.log('Closing announcement');
      await page.evaluate(() => {
        const closeButton: HTMLDivElement = document.querySelector('div[aria-label="close button"]');
        if (closeButton) {
          closeButton.click();
        }
      });
    }
  }

  private async login(page: Page) {
    // Check if exists fields to fill
    await page.waitForSelector('#username').catch(async () => {
      await page.goto(this.url, {waitUntil: 'networkidle0'});
    });

    // Fill username and password
    await page.type('#username', this.username);
    await page.type('#password', this.password);

    // Read captcha field
    const token = await this.solveCaptcha(page);

    console.log('Token:', token);

    await page.evaluate((token) => {
      const captchaField = document.getElementById('g-recaptcha-response');
      return captchaField.innerText = token;
    }, token);

    // Submit form
    this.logger.log('Clicking login button');
    await page.click('#kc-login', {delay: 1000});

    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // Check if was redirected to main page
    if (page.url().includes('/auth')) {
      this.logger.error('Login failed');

      // If public folder does not exist, create it
      if (!fs.existsSync('public')) await fs.mkdir('public');

      const screenshotPath = `public/login-failed${ new Date().getTime() }.png`;
      await page.screenshot({path: screenshotPath, fullPage: true});

      this.logger.log(`Screenshot saved as ${ screenshotPath }`);
      return false;
    }

    if (page.url().includes('/main')) this.logger.log('Logged in successfully');

    return true;
  }

  private async solveCaptcha(page: Page) {
    const solver = new Solver(this.captchaSolverApiKey);

    const token = await solver.recaptcha({
      pageurl: page.url(),
      googlekey: this.siteKey
    });

    return token.data;
  }
}
