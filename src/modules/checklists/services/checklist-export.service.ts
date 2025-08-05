import { Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistExecutionService }     from './checklist-execution.service';
import { ExecutionReportDto }            from '../domain/dto/execution-report.dto';
import { ApprovalStatus }                from '../domain/enums/approval-status.enum';
import * as ExcelJS                      from 'exceljs';
import * as puppeteer                    from 'puppeteer';
import { existsSync }                    from 'fs';

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
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
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
   * Generate professional HTML content for PDF
   */
  private generatePdfHtml(reportData: ExecutionReportDto): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const statusColor = this.getStatusColor(reportData.status);
    const scoreColor = this.getScoreColor(reportData.percentageScore || 0);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checklist Execution Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .execution-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 16px;
            color: #333;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background-color: ${ statusColor };
            color: white;
        }
        
        .score-container {
            text-align: center;
            margin: 30px 0;
        }
        
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(${ scoreColor } ${ (reportData.percentageScore || 0) * 3.6 }deg, #e9ecef 0deg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            position: relative;
        }
        
        .score-circle::before {
            content: '';
            width: 90px;
            height: 90px;
            background: white;
            border-radius: 50%;
            position: absolute;
        }
        
        .score-text {
            font-size: 24px;
            font-weight: 700;
            color: ${ scoreColor };
            z-index: 1;
        }
        
        .score-label {
            font-size: 14px;
            color: #666;
            font-weight: 500;
        }
        
        .category {
            background: white;
            border-radius: 8px;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .category-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .category-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .category-score {
            font-size: 14px;
            color: #666;
        }
        
        .questions-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .questions-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .questions-table td {
            padding: 15px 12px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: top;
        }
        
        .questions-table tr:hover {
            background: #f8f9fa;
        }
        
        .question-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .question-description {
            font-size: 13px;
            color: #666;
            line-height: 1.4;
        }
        
        .approval-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .approved { background: #d4edda; color: #155724; }
        .not-approved { background: #f8d7da; color: #721c24; }
        .intermediate { background: #fff3cd; color: #856404; }
        
        .weight-badge {
            background: #e9ecef;
            color: #495057;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .footer {
            margin-top: 40px;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e9ecef;
        }
        
        .no-answer {
            color: #999;
            font-style: italic;
        }
        
        @media print {
            .category {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Checklist Execution Report</h1>
        <div class="subtitle">Generated on ${ currentDate }</div>
    </div>
    
    <div class="container">
        <div class="execution-info">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Execution ID</div>
                    <div class="info-value">${ reportData.id }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Template/Group</div>
                    <div class="info-value">${ reportData.templateName || reportData.groupName || 'N/A' }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Executor</div>
                    <div class="info-value">${ reportData.executorUserName }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Target</div>
                    <div class="info-value">${ reportData.targetType }: ${ reportData.targetId }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">
                        <span class="status-badge">${ reportData.status }</span>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-label">Completed At</div>
                    <div class="info-value">${ reportData.completedAt ? new Date(reportData.completedAt).toLocaleString() : 'Not completed' }</div>
                </div>
            </div>
            ${ reportData.notes ? `
            <div class="info-item">
                <div class="info-label">Notes</div>
                <div class="info-value">${ reportData.notes }</div>
            </div>
            ` : '' }
        </div>
        
        ${ reportData.percentageScore !== undefined ? `
        <div class="score-container">
            <div class="score-circle">
                <div class="score-text">${ reportData.percentageScore.toFixed(1) }%</div>
            </div>
            <div class="score-label">Overall Performance Score</div>
        </div>
        ` : '' }
        
        ${ reportData.categories.map(category => `
        <div class="category">
            <div class="category-header">
                <div class="category-title">${ category.title }</div>
                ${ category.description ? `<div class="category-description">${ category.description }</div>` : '' }
                ${ category.categoryScore !== undefined ? `
                <div class="category-score">Category Score: ${ category.categoryScore.toFixed(1) }%</div>
                ` : '' }
            </div>
            
            <table class="questions-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Question</th>
                        <th style="width: 15%;">Weight</th>
                        <th style="width: 15%;">Status</th>
                        <th style="width: 10%;">Score</th>
                        <th style="width: 20%;">Comments</th>
                    </tr>
                </thead>
                <tbody>
                    ${ category.questions.map(question => `
                    <tr>
                        <td>
                            <div class="question-title">${ question.title }</div>
                            ${ question.description ? `<div class="question-description">${ question.description }</div>` : '' }
                            ${ question.required ? '<div style="color: #dc3545; font-size: 11px; margin-top: 3px;">* Required</div>' : '' }
                        </td>
                        <td>
                            <span class="weight-badge">${ question.weight }</span>
                        </td>
                        <td>
                            ${ question.answer ? `
                            <span class="approval-badge ${ question.answer.approvalStatus.toLowerCase().replace('_', '-') }">${ question.answer.approvalStatus }</span>
                            ` : '<span class="no-answer">No answer</span>' }
                        </td>
                        <td>
                            ${ question.answer && question.answer.answerScore !== undefined ?
      `${ question.answer.answerScore.toFixed(1) }/${ question.answer.maxScore?.toFixed(1) || 'N/A' }` :
      '<span class="no-answer">-</span>' }
                        </td>
                        <td>
                            ${ question.answer && question.answer.comment ? question.answer.comment : '<span class="no-answer">No comments</span>' }
                        </td>
                    </tr>
                    `).join('') }
                </tbody>
            </table>
        </div>
        `).join('') }
        
        <div class="footer">
            <p>This report was automatically generated by the Checklist Management System</p>
            <p>Report ID: ${ reportData.id } | Generated: ${ currentDate }</p>
        </div>
    </div>
</body>
</html>`;
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
