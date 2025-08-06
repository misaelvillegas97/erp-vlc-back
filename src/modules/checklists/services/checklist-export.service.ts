import { Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistExecutionService }     from './checklist-execution.service';
import { ExecutionReportDto }            from '../domain/dto/execution-report.dto';
import { ApprovalStatus }                from '../domain/enums/approval-status.enum';
import * as ExcelJS                      from 'exceljs';
import * as puppeteer                    from 'puppeteer';
import { existsSync, readFileSync }      from 'fs';
import * as Handlebars                   from 'handlebars';
import { join }                          from 'path';

@Injectable()
export class ChecklistExportService {
  constructor(
    private readonly executionService: ChecklistExecutionService
  ) {}

  /**
   * Export execution report as PDF
   */
  async exportToPdf(executionId: string): Promise<Buffer> {
    const reportData = await this.executionService.getExecutionReport(executionId);

    if (!reportData) {
      throw new NotFoundException(`Execution report with ID ${ executionId } not found`);
    }

    const htmlContent = this.generatePdfHtml(reportData);

    let browser;
    try {
      browser = await puppeteer.launch(this.getPuppeteerConfig());
    } catch (error) {
      throw new Error(`Failed to launch browser for PDF generation: ${ error.message }`);
    }

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, {waitUntil: 'networkidle0'});

      const pdfBuffer = await page.pdf({
        format: 'A4',
        scale: 0.8,
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },

      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${ error.message }`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Export execution report as Excel
   */
  async exportToExcel(executionId: string): Promise<Buffer> {
    const reportData = await this.executionService.getExecutionReport(executionId);

    if (!reportData) {
      throw new NotFoundException(`Execution report with ID ${ executionId } not found`);
    }

    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'Checklist Management System';
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create main worksheet
    const worksheet = workbook.addWorksheet('Execution Report');

    this.setupExcelWorksheet(worksheet, reportData);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate professional HTML content for PDF using Handlebars template
   */
  private generatePdfHtml(reportData: ExecutionReportDto): string {
    // Load the template file
    const templatePath = join(process.cwd(), 'src', 'shared', 'checklist-report-template.html');
    const templateSource = readFileSync(templatePath, 'utf8');

    // Compile the template
    const template = Handlebars.compile(templateSource);

    // Prepare data for the template
    const templateData = this.prepareTemplateData(reportData);

    // Render the template with data
    return template(templateData);
  }

  /**
   * Prepare data structure for Handlebars template
   */
  private prepareTemplateData(reportData: ExecutionReportDto): any {
    const currentDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate total questions
    const totalQuestions = reportData.categories.reduce((sum, cat) => sum + cat.questions.length, 0);

    // Calculate duration (placeholder - you may need to implement this based on your data)
    const duration = 'N/D'; // This should be calculated from your execution data

    // Prepare categories with enhanced data
    const categories = reportData.categories.map(category => ({
      ...category,
      scoreClass: this.getScoreClass(category.categoryScore),
      questions: category.questions.map(question => ({
        ...question,
        answer: question.answer ? {
          ...question.answer,
          statusClass: this.getStatusClass(question.answer.approvalStatus),
          statusIcon: this.getStatusIcon(question.answer.approvalStatus),
          percentage: question.answer.maxScore ?
            ((question.answer.answerScore / question.answer.maxScore) * 100).toFixed(1) : '0',
          answeredAt: question.answer.answeredAt ?
            new Date(question.answer.answeredAt).toLocaleString('es-ES') : 'N/D'
        } : null
      }))
    }));

    return {
      currentDate,
      id: reportData.id,
      executorUserName: reportData.executorUserName,
      targetType: reportData.targetType,
      targetId: reportData.targetId,
      status: reportData.status,
      templateName: reportData.templateName || reportData.groupName || 'N/D',
      completedAt: reportData.completedAt ?
        new Date(reportData.completedAt).toLocaleString('es-ES') : 'No completado',
      notes: reportData.notes,
      percentageScore: reportData.percentageScore?.toFixed(1),
      duration,
      totalQuestions,
      categories
    };
  }

  /**
   * Get CSS class for score styling
   */
  private getScoreClass(score?: number): string {
    if (!score) return '';
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  /**
   * Get CSS class for approval status
   */
  private getStatusClass(status: ApprovalStatus): string {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'success';
      case ApprovalStatus.NOT_APPROVED:
        return 'danger';
      case ApprovalStatus.INTERMEDIATE:
        return 'warning';
      default:
        return '';
    }
  }

  /**
   * Get icon class for approval status
   */
  private getStatusIcon(status: ApprovalStatus): string {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'icon-check';
      case ApprovalStatus.NOT_APPROVED:
        return 'icon-cancel';
      case ApprovalStatus.INTERMEDIATE:
        return 'icon-skip';
      default:
        return 'icon-question';
    }
  }

  /**
   * Setup Excel worksheet with data and formatting
   */
  private setupExcelWorksheet(worksheet: ExcelJS.Worksheet, reportData: ExecutionReportDto): void {
    // Set column widths
    worksheet.columns = [
      {header: 'Category', key: 'category', width: 25},
      {header: 'Question', key: 'question', width: 40},
      {header: 'Description', key: 'description', width: 30},
      {header: 'Weight', key: 'weight', width: 10},
      {header: 'Required', key: 'required', width: 10},
      {header: 'Status', key: 'status', width: 15},
      {header: 'Score', key: 'score', width: 10},
      {header: 'Max Score', key: 'maxScore', width: 10},
      {header: 'Comments', key: 'comments', width: 30},
      {header: 'Evidence', key: 'evidence', width: 25}
    ];

    // Add title and execution info
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Checklist Execution Report';
    titleCell.font = {size: 18, bold: true, color: {argb: 'FF667eea'}};
    titleCell.alignment = {horizontal: 'center', vertical: 'middle'};
    titleCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFF8F9FA'}};

    // Add execution details
    let currentRow = 3;
    const executionDetails = [
      [ 'Execution ID:', reportData.id ],
      [ 'Template/Group:', reportData.templateName || reportData.groupName || 'N/A' ],
      [ 'Executor:', reportData.executorUserName ],
      [ 'Target:', `${ reportData.targetType }: ${ reportData.targetId }` ],
      [ 'Status:', reportData.status ],
      [ 'Completed At:', reportData.completedAt ? new Date(reportData.completedAt).toLocaleString() : 'Not completed' ],
      [ 'Overall Score:', reportData.percentageScore ? `${ reportData.percentageScore.toFixed(1) }%` : 'N/A' ]
    ];

    executionDetails.forEach(([ label, value ]) => {
      worksheet.getCell(`A${ currentRow }`).value = label;
      worksheet.getCell(`A${ currentRow }`).font = {bold: true};
      worksheet.getCell(`B${ currentRow }`).value = value;
      currentRow++;
    });

    if (reportData.notes) {
      worksheet.getCell(`A${ currentRow }`).value = 'Notes:';
      worksheet.getCell(`A${ currentRow }`).font = {bold: true};
      worksheet.getCell(`B${ currentRow }`).value = reportData.notes;
      currentRow++;
    }

    currentRow += 2; // Add spacing

    // Add headers
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = [ 'Category', 'Question', 'Description', 'Weight', 'Required', 'Status', 'Score', 'Max Score', 'Comments', 'Evidence' ];
    headerRow.font = {bold: true, color: {argb: 'FFFFFFFF'}};
    headerRow.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF667eea'}};
    headerRow.alignment = {horizontal: 'center', vertical: 'middle'};
    headerRow.height = 25;

    currentRow++;

    // Add data rows
    reportData.categories.forEach(category => {
      category.questions.forEach(question => {
        const row = worksheet.getRow(currentRow);
        row.values = [
          category.title,
          question.title,
          question.description || '',
          question.weight,
          question.required ? 'Yes' : 'No',
          question.answer?.approvalStatus || 'No Answer',
          question.answer?.answerScore?.toFixed(1) || '',
          question.answer?.maxScore?.toFixed(1) || '',
          question.answer?.comment || '',
          question.answer?.evidenceFile || ''
        ];

        // Apply conditional formatting based on approval status
        if (question.answer) {
          const statusCell = row.getCell(6);
          switch (question.answer.approvalStatus) {
            case ApprovalStatus.APPROVED:
              statusCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFD4EDDA'}};
              statusCell.font = {color: {argb: 'FF155724'}};
              break;
            case ApprovalStatus.NOT_APPROVED:
              statusCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFF8D7DA'}};
              statusCell.font = {color: {argb: 'FF721C24'}};
              break;
            case ApprovalStatus.INTERMEDIATE:
              statusCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFFF3CD'}};
              statusCell.font = {color: {argb: 'FF856404'}};
              break;
          }
        }

        // Highlight required questions
        if (question.required) {
          row.getCell(5).font = {bold: true, color: {argb: 'FFDC3545'}};
        }

        currentRow++;
      });
    });

    // Add borders to all data cells
    const dataRange = `A${ currentRow - reportData.categories.reduce((sum, cat) => sum + cat.questions.length, 0) }:J${ currentRow - 1 }`;
    worksheet.getCell(dataRange).border = {
      top: {style: 'thin'},
      left: {style: 'thin'},
      bottom: {style: 'thin'},
      right: {style: 'thin'}
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({includeEmpty: true}, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });
  }

  /**
   * Get status color for styling
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return '#28a745';
      case 'PENDING':
        return '#ffc107';
      case 'LOW_PERFORMANCE':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }

  /**
   * Get score color based on percentage
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }

  /**
   * Get Puppeteer configuration based on environment
   */
  private getPuppeteerConfig(): any {
    const config: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    };

    // Use system Chrome if available (production environment)
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (executablePath) {
      config.executablePath = executablePath;
      return config;
    }

    // For development, try to use system Chrome if bundled Chrome fails
    const possibleChromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];

    for (const chromePath of possibleChromePaths) {
      try {
        if (existsSync(chromePath)) {
          config.executablePath = chromePath;
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    return config;
  }
}
