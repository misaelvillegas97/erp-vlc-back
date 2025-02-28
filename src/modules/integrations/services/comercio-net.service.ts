import { Injectable, Logger }                           from '@nestjs/common';
import * as puppeteer                                   from 'puppeteer';
import { Browser, ElementHandle, executablePath, Page } from 'puppeteer';
import { ConfigService }                                from '@nestjs/config';
import { AllConfigType }                                from '@core/config/config.type';
import { Environment }                                  from '@core/config/app.config';

interface Order {
  id: string;
  size: string;
  receptionDate: string;
  deliveryLocation: string;
  issuer: string;
  status: string;
}

interface Product {
  line: string;
  upcCode: string;
  item: string;
  providerCode: string;
  size: string;
  description: string;
  quantity: string;
  unitPrice: string;
  unitsPerPackage: string;
  packages: string;
  totalPrice: string;
}

interface OrderDetail {
  issuer: string;
  receptor: string;
  purchaseOrder: string;
  generationDate: string;
  shipmentDate: string;
  cancellationDate: string;
  paymentConditions: string;
  deliveryLocation: string;
  salesDepartment: string;
  orderType: string;
  promotion: string;
  providerNumber: string;
  issuerInfo: string;
  vendorInfo: string;
  observations: string;
  products: Product[];
}

@Injectable()
export class ComercioNetService {
  private readonly logger = new Logger(ComercioNetService.name);
  private readonly username: string;
  private readonly password: string;
  private readonly environment: Environment;

  constructor(private readonly cs: ConfigService<AllConfigType>) {
    this.username = this.cs.get('comercio.username', {infer: true});
    this.password = this.cs.get('comercio.password', {infer: true});
    this.environment = this.cs.get('app.nodeEnv', {infer: true});
  }

  async run(): Promise<Order[]> {
    const browser: Browser = await puppeteer.launch({
      headless: true,
      args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu' ],
      executablePath: this.environment === Environment.Development ? executablePath() : '/usr/bin/google-chrome',
    });
    const page = await browser.newPage();

    await page.setViewport({width: 1920, height: 1080});

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.performLogin(page);

        const orders = await this.extractOrders(browser, page);

        await page.close();
        await browser.close();

        return orders;
      } catch (error) {
        this.logger.error(`Attempt ${ attempt + 1 } failed:`, error);
        attempt++;
        if (attempt === maxRetries) {
          await browser.close();
          throw error;
        }
      }
    }
  }

  async extractOrders(browser: Browser, page: Page): Promise<Order[]> {
    const lastWeek = new Date(new Date().getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayDate = new Date().toISOString().split('T')[0];
    const queryParams = {
      tido_id: '9',
      tipo: 'recibidos',
      fecha_inicio: lastWeek,
      fecha_termino: todayDate,
      estado: '0',
      offset: '0',
    };

    const url = 'https://www.comercionet.cl/listadoDocumentos.php?' + new URLSearchParams(queryParams);
    this.logger.log(`Extracting orders from ${ url }`);

    try {
      this.logger.log('Navigating to the orders page...');
      await page.goto(url, {waitUntil: 'networkidle0'});

      this.logger.log('Waiting for the table to be present in the DOM...');
      await page.waitForSelector('table.tabla');

      this.logger.log('Table found, waiting for 3 seconds to load the table info.');
      await new Promise((resolve) => setTimeout(resolve, 3_000));

      // Extract rows from the table
      const orders: Order[] = [];
      const rows = await page.$$('table.tabla tr');

      for (const row of rows.slice(1)) {
        const columns: ElementHandle<HTMLTableCellElement>[] = await row.$$('td');
        const radius: ElementHandle<HTMLInputElement> = await columns[0]?.$('input[type="radio"]');

        if (radius) {
          await radius.click();
        }

        // Haz clic en el botón "Visualizar"
        await page.click('a[onClick="visualizar()"]');

        // Espera a que se abra la nueva ventana
        const newPagePromise = new Promise((resolve) => browser.once('targetcreated', (target) => resolve(target.page())));
        const newPage: Page = (await newPagePromise) as Page;

        console.log('New page opened.');

        // Espera a que la nueva página cargue completamente
        await newPage.waitForSelector('body');

        const orderDetail = await this.extractOrderDetails(newPage);

        orders.push({
          id: await page.evaluate((el) => el.textContent?.trim(), columns[1]),
          size: await page.evaluate((el) => el.textContent?.trim(), columns[2]),
          receptionDate: await page.evaluate((el) => el.textContent?.trim(), columns[3]),
          deliveryLocation: await page.evaluate((el) => el.textContent?.trim(), columns[4]),
          issuer: await page.evaluate((el) => el.textContent?.trim(), columns[5]),
          status: await page.evaluate((el) => el.textContent?.trim(), columns[6]),
          detail: orderDetail,
        } as Order);

        // Cierra la ventana actual
        await newPage.close();
      }

      return orders;
    } catch (error) {
      this.logger.error('An error occurred while extracting orders:', error);

      return [];
    }
  }

  async downloadAllDocuments(browser: Browser, page: Page): Promise<void> {
    // Selecciona todos los checkboxes de los documentos
    const documentCheckboxes = await page.$$('input[name="documento"]');
    console.log(`Found ${ documentCheckboxes.length } document checkboxes.`);

    for (let i = 0; i < documentCheckboxes.length; i++) {
      // Selecciona el checkbox correspondiente
      await documentCheckboxes[i].click();

      // Haz clic en el botón "Visualizar"
      await page.click('a[onClick="visualizar()"]');

      console.log(`Downloading document ${ i + 1 }...`);

      // Espera a que se abra la nueva ventana
      const newPagePromise = new Promise((resolve) => browser.once('targetcreated', (target) => resolve(target.page())));
      const newPage: Page = (await newPagePromise) as Page;

      console.log('New page opened.');

      // Espera a que la nueva página cargue completamente
      await newPage.waitForSelector('body');

      // Cierra la ventana actual
      await newPage.close();

      // Deselecciona el checkbox para el siguiente documento
      await documentCheckboxes[i].click();
    }
  }

  async extractOrderDetails(page: puppeteer.Page): Promise<any> {
    console.log('Extracting order details...');
    return await page
      .evaluate(() => {
        const logs: string[] = [];

        const log = (message: string, ...args) => {
          logs.push(message);
          logs.push(...args);
        };

        log('Declaring extractText function...');
        const extractText = (label: string): string => {
          const thElements = Array.from(document.querySelectorAll('table th'));
          const targetTh = thElements.find((th) => th.textContent?.trim().includes(label));
          const targetTd = targetTh?.nextElementSibling;
          return targetTd ? targetTd.textContent?.trim() || '' : '';
        };

        log('Declaring extractProducts function...');
        const extractProducts = (): Product[] => {
          log('Extracting products...');

          const rows = Array.from(document.querySelectorAll('table.tabla-ord_wm')[3].querySelectorAll('tbody tr'));

          log('rows', rows);

          // Products have this distribution, tr for headers, tr for data, tr for description, br, tr for data, tr for description, etc

          return rows
            .filter((row) => row.querySelectorAll('td').length > 0 && !row.querySelector('th')) // Exclude header rows
            .filter((row, index) => index % 2 === 0) // Only get the rows with data
            .map((row) => {
              const columns = row.querySelectorAll('td');

              const descriptionSibling = row.nextElementSibling;
              const text = descriptionSibling?.querySelector('td')?.textContent?.trim() || '';

              return {
                line: columns[0]?.textContent?.trim() || '',
                upcCode: columns[1]?.textContent?.trim() || '',
                item: columns[2]?.textContent?.trim() || '',
                providerCode: columns[3]?.textContent?.trim() || '',
                size: columns[4]?.textContent?.trim() || '',
                description: columns[5]?.textContent?.trim() || '',
                quantity: columns[6]?.textContent?.trim() || '',
                unitPrice: columns[7]?.textContent?.trim() || '',
                unitsPerPackage: columns[8]?.textContent?.trim() || '',
                packages: columns[9]?.textContent?.trim() || '',
                totalPrice: columns[10]?.textContent?.trim() || '',
                observation: text,
              };
            });
        };

        log('Declaring extractObservations function...');
        const extractObservations = (): string => {
          const observationTable = document.querySelectorAll('table.tabla-ord_wm')[2]; // Observations table
          const observationRow: HTMLTableRowElement = observationTable?.querySelector('tbody tr');
          return observationRow ? observationRow.cells[1]?.textContent?.trim() || '' : '';
        };

        log('Declaring extractAdditionalInfo function...');
        const extractAdditionalInfo = (): any => {
          const additionalInfoTable: HTMLTableElement = document.querySelectorAll('table.tabla-ord_wm')[4] as HTMLTableElement; // Additional info table
          const rows: HTMLTableRowElement[] = Array.from(additionalInfoTable.querySelectorAll('tbody tr'));
          const additionalInfo: { [key: string]: string } = {};

          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
              additionalInfo[cells[0].textContent?.trim() || ''] = cells[1].textContent?.trim() || '';
            }
          });

          return additionalInfo;
        };

        const products = extractProducts();

        log('extracting products', products);

        return {
          issuer: extractText('Emisor:'),
          receptor: extractText('Receptor:'),
          purchaseOrder: extractText('Número de Orden de Compra:'),
          generationDate: extractText('Fecha generación Mensaje:'),
          shipmentDate: extractText('Fecha de Embarque:'),
          cancellationDate: extractText('Fecha de Cancelacion:'),
          paymentConditions: extractText('Condiciones de Pago:'),
          deliveryLocation: extractText('Lugar de Entrega:'),
          salesDepartment: extractText('Departamento de Ventas:'),
          orderType: extractText('Tipo de Orden de Compra:'),
          promotion: extractText('Promocion:'),
          providerNumber: extractText('Numero de Proveedor'),
          issuerInfo: extractText('Información Emisor'),
          vendorInfo: extractText('Información Vendedor'),
          observations: extractObservations(),
          products: products,
          additionalInfo: extractAdditionalInfo(), // New field for additional info
          logs,
        };
      })
      .then((result) => {
        const {logs, ...orderDetail} = result;
        logs.forEach((log: string) => console.log(log));
        return orderDetail as OrderDetail;
      });
  }

  // Check if the session is authenticated by looking for a specific element
  private async isAuthenticated(page: puppeteer.Page): Promise<boolean> {
    // Wait for the frames to load
    await page.waitForSelector('frame[name="top"]', {timeout: 5000}).catch(() => null);
    await page.waitForSelector('frame[name="menu"]', {timeout: 5000}).catch(() => null);
    await page.waitForSelector('frame[name="contenido"]', {timeout: 5000}).catch(() => null);

    // Get all frames in the page
    const frames = page.frames();

    // Check for the presence of the 'top' frame
    const topFrame = frames.find((frame) => frame.name() === 'top');
    if (!topFrame) {
      console.log('Top frame not found.');
      return false;
    }

    // Check for the presence of the 'menu' frame
    const menuFrame = frames.find((frame) => frame.name() === 'menu');
    if (!menuFrame) {
      console.log('Menu frame not found.');
      return false;
    }

    // Check for the presence of the 'contenido' frame
    const contenidoFrame = frames.find((frame) => frame.name() === 'contenido');
    if (!contenidoFrame) {
      console.log('Contenido frame not found.');
      return false;
    }

    // Optionally, you can further verify by checking specific content within these frames
    // For example, checking if the 'top' frame contains a specific element or text
    const topFrameContent = await topFrame.content();
    if (topFrameContent.includes('Expected Text or Element')) {
      console.log('Authenticated: Specific content found in top frame.');
      return true;
    }

    console.log('Authenticated frames found.');
    return true;
  }

  // Perform the login process
  private async performLogin(page: puppeteer.Page): Promise<void> {
    // Navigate to the login page
    await page.goto('https://www.comercionet.cl/comercionet/index.php', {
      waitUntil: 'networkidle0',
    });

    // Fill in the login form
    await page.type('input[name="login"]', this.username, {delay: 100});
    await page.type('input[name="_password"]', this.password, {delay: 100});

    // Submit the form
    await Promise.all([ page.click('input[type="submit"]'), page.waitForNavigation({waitUntil: 'networkidle0'}) ]);

    // Verify that the login was successful
    if (await this.isAuthenticated(page)) {
      this.logger.log('Login successful.');
    } else {
      throw new Error('Login failed.');
    }
  }
}
