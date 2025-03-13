import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import * as ExcelJS           from 'exceljs';
import { OrderEntity }        from '@modules/orders/domain/entities/order.entity';
import { DateTime }           from 'luxon';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger('ReportsService');

  constructor(
    @InjectRepository(OrderEntity) private ordersRepository: Repository<OrderEntity>,
  ) {}

  /**
   * Generate a delivery report based on the given parameters
   * @param startDate Start date for the report
   * @param endDate End date for the report
   * @param driverId Optional driver ID to filter the report
   *
   * @returns Delivery report data
   */
  async generateDeliveryReport(startDate: string, endDate: string, driverId?: string): Promise<any> {
    if (!startDate) startDate = DateTime.now().startOf('day').toISODate();
    if (!endDate) endDate = DateTime.fromISO(startDate).plus({day: 1}).endOf('day').toISODate();

    this.logger.log(`Generating delivery report from ${ startDate } to ${ endDate }`);

    try {
      const queryBuilder = this.ordersRepository
        .createQueryBuilder('o')
        .leftJoin('o.invoices', 'i')
        .leftJoin('i.deliveryAssignment', 'd')
        .select('i.deliveryAssignment', 'driverId')
        .addSelect('concat(d.firstName, \' \', d.lastName)', 'driverName')
        .addSelect('COUNT(o.id)', 'totalDeliveries')
        .addSelect('SUM(CASE WHEN o.status = :delivered THEN 1 ELSE 0 END)', 'completedDeliveries')
        .addSelect('SUM(CASE WHEN o.deliveredDate IS NOT NULL AND o.deliveredDate <= o.deliveryDate THEN 1 ELSE 0 END)', 'onTimeDeliveries')
        .addSelect('SUM(CASE WHEN o.deliveredDate IS NOT NULL AND o.deliveredDate > o.deliveryDate THEN 1 ELSE 0 END)', 'lateDeliveries')
        .addSelect('AVG(EXTRACT(EPOCH FROM (o.delivered_date::timestamp - o.delivery_date::timestamp)) / 3600)', 'avgDeliveryTimeHours')
        .where('o.deliveryDate BETWEEN :startDate AND :endDate', {startDate, endDate})
        .andWhere('i.deliveryAssignment IS NOT NULL')
        .groupBy('i.deliveryAssignment')
        .addGroupBy('concat(d.firstName, \' \', d.lastName)')
        .setParameter('delivered', 'DELIVERED');

      if (driverId) {
        queryBuilder.andWhere('i.deliveryAssignment.id = :driverId', {driverId});
      }

      const result = await queryBuilder.getRawMany();
      this.logger.log(`Report generated with ${ result.length } records`);

      return result;
    } catch (error) {
      this.logger.error(`Error generating delivery report: ${ error.message }`, error.stack);
      throw error;
    }
  }

  /**
   * Export the delivery report to an Excel file
   *
   * @param reportData Delivery report data
   *
   * @returns Excel file buffer
   */
  async exportReportToExcel(reportData: any[]): Promise<ExcelJS.Buffer> {
    this.logger.log('Exporting report to Excel');

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte de Entregas');

      // Definir encabezados
      worksheet.columns = [
        {header: 'Chofer', key: 'driverName', width: 20},
        {header: 'Total Entregas', key: 'totalDeliveries', width: 15},
        {header: 'Entregas Completadas', key: 'completedDeliveries', width: 20},
        {header: 'A Tiempo', key: 'onTimeDeliveries', width: 15},
        {header: 'Con Retraso', key: 'lateDeliveries', width: 15},
        {header: 'Tiempo Promedio (Horas)', key: 'avgDeliveryTimeHours', width: 25},
      ];

      // Dar formato a los encabezados
      worksheet.getRow(1).font = {bold: true};
      worksheet.getRow(1).alignment = {vertical: 'middle', horizontal: 'center'};

      // Añadir los datos
      worksheet.addRows(reportData.map(item => ({
        ...item,
        avgDeliveryTimeHours: item.avgDeliveryTimeHours ?
          parseFloat(item.avgDeliveryTimeHours).toFixed(2) : '0.00'
      })));

      for (let i = 2; i <= reportData.length + 1; i++) {
        for (let j = 2; j <= 6; j++) {
          worksheet.getCell(`${ String.fromCharCode(64 + j) }${ i }`).alignment = {
            horizontal: 'right'
          };
        }
      }

      return workbook.xlsx.writeBuffer();
    } catch (error) {
      this.logger.error(`Error exporting report to Excel: ${ error.message }`, error.stack);
      throw error;
    }
  }
}
