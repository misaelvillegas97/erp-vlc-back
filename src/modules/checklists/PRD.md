# Product Requirements Document (PRD)

## Checklist Management System

### Document Information

- **Version**: 1.0
- **Date**: August 2, 2025
- **Module**: Checklists
- **Status**: Active

---

## Executive Summary

The Checklist Management System is a comprehensive solution for creating, managing, and executing quality control and compliance checklists across different target types (users, vehicles, warehouses). The system supports both individual template-based
evaluations and grouped template evaluations with weighted scoring, automatic incident generation for low performance, and detailed analytics.

### Key Features

- **Polymorphic Target Evaluation**: Support for evaluating users, vehicles, warehouses, and extensible to other entity types
- **Template & Group Management**: Create reusable checklist templates and group multiple templates for comprehensive evaluations
- **Weighted Scoring System**: Hierarchical scoring with category and question weights
- **Automatic Incident Management**: Auto-generation of incidents for low-performance executions
- **Role-Based Access Control**: Templates and groups can be restricted by user roles and vehicle types
- **Comprehensive Analytics**: Statistics and performance tracking across all executions

---

## Product Overview

### Purpose

The Checklist Management System enables organizations to standardize quality control, compliance, and inspection processes through structured, repeatable checklists that can be applied to various targets within the organization.

### Target Users

- **Quality Control Inspectors**: Execute checklists and record findings
- **Fleet Managers**: Monitor vehicle compliance and performance
- **Warehouse Supervisors**: Oversee facility and equipment inspections
- **Compliance Officers**: Track regulatory compliance across the organization
- **System Administrators**: Manage templates, groups, and system configuration

### Business Value

- Standardized evaluation processes across the organization
- Improved compliance tracking and reporting
- Automated incident detection and management
- Data-driven insights for continuous improvement
- Reduced manual oversight through automated scoring and alerting

---

## Functional Requirements

### 1. Template Management

#### 1.1 Template Creation and Configuration

- **FR-1.1.1**: System shall allow creation of checklist templates with metadata (name, description, version, type)
- **FR-1.1.2**: System shall support template categorization by checklist type (INSPECTION, COMPLIANCE, MAINTENANCE, SAFETY)
- **FR-1.1.3**: System shall allow configuration of performance thresholds for automatic incident generation
- **FR-1.1.4**: System shall support role-based template access control through user roles assignment
- **FR-1.1.5**: System shall support vehicle type restrictions for templates
- **FR-1.1.6**: System shall allow template activation/deactivation without deletion

#### 1.2 Template Structure Management

- **FR-1.2.1**: System shall support hierarchical template structure (Template → Categories → Questions)
- **FR-1.2.2**: System shall allow creation of categories within templates with sorting capabilities
- **FR-1.2.3**: System shall support question creation with configurable properties:
  - Title and description
  - Weight for scoring calculations
  - Required/optional designation
  - Intermediate approval options
  - Custom extra fields
  - Sort order within categories

#### 1.3 Template Operations

- **FR-1.3.1**: System shall provide template duplication functionality with new naming
- **FR-1.3.2**: System shall support template versioning through duplication
- **FR-1.3.3**: System shall provide template statistics including question counts and weight distributions
- **FR-1.3.4**: System shall validate weight integrity across template hierarchy
- **FR-1.3.5**: System shall support template filtering by vehicle type and user role

### 2. Group Management

#### 2.1 Group Creation and Configuration

- **FR-2.1.1**: System shall allow creation of checklist groups containing multiple templates
- **FR-2.1.2**: System shall support individual template weight assignment within groups
- **FR-2.1.3**: System shall allow group-level performance threshold configuration
- **FR-2.1.4**: System shall support role-based group access control
- **FR-2.1.5**: System shall support vehicle type restrictions for groups

#### 2.2 Group Operations

- **FR-2.2.1**: System shall validate template weight distribution within groups (sum = 1.0)
- **FR-2.2.2**: System shall support group activation/deactivation
- **FR-2.2.3**: System shall provide group filtering by template, vehicle type, and user role
- **FR-2.2.4**: System shall support group updates including template membership changes

### 3. Checklist Execution

#### 3.1 Execution Management

- **FR-3.1.1**: System shall support execution of individual templates or complete groups
- **FR-3.1.2**: System shall enforce polymorphic target evaluation (USER, VEHICLE, WAREHOUSE)
- **FR-3.1.3**: System shall clearly separate executor (who performs) from target (what/who is evaluated)
- **FR-3.1.4**: System shall validate required question responses before completion
- **FR-3.1.5**: System shall support execution timestamps and notes

#### 3.2 Answer Management

- **FR-3.2.1**: System shall support multiple approval statuses (APPROVED, NOT_APPROVED, INTERMEDIATE, SKIPPED)
- **FR-3.2.2**: System shall record approval values (0-1 scale) for scoring calculations
- **FR-3.2.3**: System shall support evidence file attachments for answers
- **FR-3.2.4**: System shall allow comments on individual answers
- **FR-3.2.5**: System shall validate answer types against question configurations

#### 3.3 Scoring System

- **FR-3.3.1**: System shall calculate hierarchical scores:
  - Individual question scores based on approval values and weights
  - Category scores as weighted averages of question scores
  - Template scores as weighted averages of category scores
  - Group scores as weighted averages of template scores
- **FR-3.3.2**: System shall calculate percentage scores for performance evaluation
- **FR-3.3.3**: System shall store maximum possible scores for comparison
- **FR-3.3.4**: System shall track execution status (PENDING, COMPLETED, LOW_PERFORMANCE)

### 4. Incident Management

#### 4.1 Automatic Incident Generation

- **FR-4.1.1**: System shall automatically generate incidents when execution scores fall below configured thresholds
- **FR-4.1.2**: System shall determine incident severity based on score deviation from threshold:
  - CRITICAL: 30+ points below threshold
  - HIGH: 20-29 points below threshold
  - MEDIUM: 10-19 points below threshold
  - LOW: 1-9 points below threshold
- **FR-4.1.3**: System shall populate incident details including failed categories and performance metrics
- **FR-4.1.4**: System shall link incidents to specific executions and targets

#### 4.2 Incident Tracking

- **FR-4.2.1**: System shall support incident status management (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- **FR-4.2.2**: System shall support incident assignment to users
- **FR-4.2.3**: System shall track incident resolution with timestamps and notes
- **FR-4.2.4**: System shall maintain incident history and follow-up counts
- **FR-4.2.5**: System shall distinguish between auto-generated and manually created incidents

### 5. Query and Reporting

#### 5.1 Execution Queries

- **FR-5.1.1**: System shall provide comprehensive execution filtering by:
  - Template or group
  - Executor user
  - Target type and ID
  - Execution status
  - Date ranges
- **FR-5.1.2**: System shall support pagination for large result sets
- **FR-5.1.3**: System shall provide execution statistics and summaries

#### 5.2 Incident Queries

- **FR-5.2.1**: System shall provide incident filtering by:
  - Vehicle (when target type is VEHICLE)
  - Execution
  - Severity level
  - Status
  - Auto-generation flag
- **FR-5.2.2**: System shall support incident analytics and reporting

---

## Technical Requirements

### 1. Architecture

#### 1.1 Technology Stack

- **Backend Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT-based authentication
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator and class-transformer

#### 1.2 Module Structure

```
src/modules/checklists/
├── controllers/           # REST API endpoints
├── services/             # Business logic
├── domain/
│   ├── entities/         # Database entities
│   ├── dto/              # Data transfer objects
│   └── enums/            # Type definitions
└── PRD.md               # This document
```

### 2. Data Model

#### 2.1 Core Entities

- **ChecklistTemplateEntity**: Template definitions with metadata and configuration
- **ChecklistGroupEntity**: Groups of templates with weighted relationships
- **CategoryEntity**: Organizational units within templates/groups
- **QuestionEntity**: Individual checklist items with scoring configuration
- **ChecklistExecutionEntity**: Execution instances with polymorphic target support
- **ChecklistAnswerEntity**: Individual question responses with evidence
- **IncidentEntity**: Auto-generated and manual incidents with tracking

#### 2.2 Enumerations

- **ChecklistType**: INSPECTION, COMPLIANCE, MAINTENANCE, SAFETY
- **TargetType**: USER, VEHICLE, WAREHOUSE (extensible)
- **ExecutionStatus**: PENDING, COMPLETED, LOW_PERFORMANCE
- **ApprovalStatus**: APPROVED, NOT_APPROVED, INTERMEDIATE, SKIPPED
- **IncidentSeverity**: LOW, MEDIUM, HIGH, CRITICAL
- **IncidentStatus**: OPEN, IN_PROGRESS, RESOLVED, CLOSED

### 3. API Specifications

#### 3.1 Template Management API

```
POST   /checklists/templates              # Create template
GET    /checklists/templates              # List templates with filtering
GET    /checklists/templates/:id          # Get template details
PUT    /checklists/templates/:id          # Update template
DELETE /checklists/templates/:id          # Delete template
POST   /checklists/templates/:id/duplicate # Duplicate template
PATCH  /checklists/templates/:id/toggle   # Toggle active status
GET    /checklists/templates/:id/statistics # Get template statistics
GET    /checklists/templates/filter       # Filter by vehicle type/user role
GET    /checklists/templates/admin/test   # Health check endpoint
```

#### 3.2 Group Management API

```
POST   /checklists/groups                 # Create group
GET    /checklists/groups                 # List groups with filtering
GET    /checklists/groups/:id             # Get group details
PUT    /checklists/groups/:id             # Update group
DELETE /checklists/groups/:id             # Delete group
PATCH  /checklists/groups/:id/deactivate  # Deactivate group
GET    /checklists/groups/template/:templateId # Find groups by template
GET    /checklists/groups/active          # Get active groups
GET    /checklists/groups/vehicle-type/:vehicleType # Filter by vehicle type
GET    /checklists/groups/user-role/:userRole # Filter by user role
```

#### 3.3 Execution Management API

```
POST   /checklists/executions             # Execute checklist
GET    /checklists/executions             # List executions with filtering
GET    /checklists/executions/:id         # Get execution details
GET    /checklists/executions/statistics/summary # Get execution statistics
GET    /checklists/executions/target/:targetType/:targetId # Get executions by target
GET    /checklists/executions/executor/:userId # Get executions by executor
GET    /checklists/executions/template/:templateId # Get executions by template
```

#### 3.4 Incident Management API

```
POST   /checklists/incidents              # Create manual incident
GET    /checklists/incidents              # List incidents with filtering
GET    /checklists/incidents/:id          # Get incident details
GET    /checklists/incidents/vehicle/:vehicleId # Get incidents by vehicle
GET    /checklists/incidents/execution/:executionId # Get incidents by execution
GET    /checklists/incidents/auto-generated # Get auto-generated incidents
GET    /checklists/incidents/severity/:severity # Get incidents by severity
GET    /checklists/incidents/open         # Get open incidents
```

### 4. Security Requirements

#### 4.1 Authentication and Authorization

- **TR-4.1.1**: All endpoints shall require JWT authentication
- **TR-4.1.2**: System shall support role-based access control for templates and groups
- **TR-4.1.3**: System shall validate user permissions for target evaluation

#### 4.2 Data Validation

- **TR-4.2.1**: All input data shall be validated using class-validator decorators
- **TR-4.2.2**: System shall enforce referential integrity for all relationships
- **TR-4.2.3**: System shall validate weight distributions and scoring calculations

### 5. Performance Requirements

#### 5.1 Response Times

- **TR-5.1.1**: API endpoints shall respond within 2 seconds for standard operations
- **TR-5.1.2**: Complex queries with large datasets shall implement pagination
- **TR-5.1.3**: Database queries shall be optimized with appropriate indexing

#### 5.2 Scalability

- **TR-5.2.1**: System shall support concurrent execution of multiple checklists
- **TR-5.2.2**: Database schema shall support horizontal scaling
- **TR-5.2.3**: System shall handle large volumes of historical execution data

---

## User Stories

### Epic 1: Template Management

**US-1.1**: As a Quality Manager, I want to create checklist templates so that I can standardize inspection processes across the organization.

**Acceptance Criteria**:

- I can create templates with descriptive metadata
- I can organize questions into logical categories
- I can set performance thresholds for automatic incident generation
- I can restrict template access by user roles and vehicle types

**US-1.2**: As a Quality Manager, I want to duplicate existing templates so that I can create variations without starting from scratch.

**Acceptance Criteria**:

- I can duplicate any existing template with a new name
- All categories and questions are copied to the new template
- I can modify the duplicated template independently

### Epic 2: Group Management

**US-2.1**: As a Compliance Officer, I want to create template groups so that I can perform comprehensive evaluations using multiple related templates.

**Acceptance Criteria**:

- I can select multiple templates to include in a group
- I can assign individual weights to each template in the group
- The system validates that template weights sum to 1.0
- I can set group-level performance thresholds

### Epic 3: Checklist Execution

**US-3.1**: As an Inspector, I want to execute checklists on different targets so that I can evaluate users, vehicles, or warehouses as needed.

**Acceptance Criteria**:

- I can select the target type (USER, VEHICLE, WAREHOUSE)
- I can specify the target ID being evaluated
- The system clearly distinguishes between me as the executor and the target being evaluated
- I can execute either individual templates or complete groups

**US-3.2**: As an Inspector, I want to answer checklist questions with evidence so that I can provide comprehensive evaluation records.

**Acceptance Criteria**:

- I can select approval status for each question
- I can attach evidence files to support my answers
- I can add comments to provide additional context
- The system validates that all required questions are answered

### Epic 4: Incident Management

**US-4.1**: As a Fleet Manager, I want the system to automatically create incidents for low-performance evaluations so that I can quickly identify and address issues.

**Acceptance Criteria**:

- Incidents are automatically created when scores fall below thresholds
- Incident severity is determined by the degree of performance deviation
- Incidents include details about failed categories and performance metrics
- I can track incident resolution and assign them to team members

### Epic 5: Reporting and Analytics

**US-5.1**: As a Quality Manager, I want to view execution statistics so that I can monitor performance trends and identify improvement opportunities.

**Acceptance Criteria**:

- I can view overall execution statistics including completion rates and average scores
- I can filter executions by various criteria (template, executor, target, date range)
- I can see detailed breakdowns by category and question performance
- I can export data for further analysis

---

## Acceptance Criteria

### System-Level Acceptance Criteria

#### AC-1: Data Integrity

- All database relationships maintain referential integrity
- Weight calculations are mathematically accurate across all hierarchy levels
- Execution scores are consistently calculated and stored
- Historical data is preserved during template and group modifications

#### AC-2: User Experience

- API responses include comprehensive error messages for validation failures
- All endpoints provide consistent response formats
- Pagination is implemented for large datasets
- API documentation is complete and accurate

#### AC-3: Security

- All endpoints require valid JWT authentication
- Role-based access control is enforced for templates and groups
- Input validation prevents injection attacks and data corruption
- Audit trails are maintained for all critical operations

#### AC-4: Performance

- Standard CRUD operations complete within 2 seconds
- Complex queries with filtering and pagination perform efficiently
- Database indexes optimize common query patterns
- System handles concurrent operations without data corruption

#### AC-5: Extensibility

- New target types can be added without breaking existing functionality
- Template and group structures support future enhancements
- API versioning supports backward compatibility
- Module architecture supports independent testing and deployment

---

## Glossary

**Checklist Template**: A reusable definition of questions organized into categories for evaluating specific aspects of targets.

**Checklist Group**: A collection of multiple templates with individual weights for comprehensive evaluations.

**Execution**: An instance of performing a checklist template or group on a specific target.

**Executor**: The user who performs the checklist evaluation.

**Target**: The entity being evaluated (user, vehicle, warehouse, etc.).

**Category**: An organizational unit within templates that groups related questions.

**Question**: An individual evaluation item with configurable scoring and validation rules.

**Incident**: An automatically or manually created record of issues identified during checklist execution.

**Performance Threshold**: A configurable score below which incidents are automatically generated.

**Weight**: A numerical value (0-1) that determines the relative importance of questions, categories, or templates in scoring calculations.

**Polymorphic Target**: The system's ability to evaluate different types of entities using the same checklist structure.

---

## Appendices

### Appendix A: Database Schema Overview

The system uses a hierarchical structure with the following key relationships:

- Templates contain Categories, which contain Questions
- Groups contain Templates with individual weights
- Executions reference either Templates or Groups and specify polymorphic targets
- Answers link Questions to Executions with approval values
- Incidents are automatically generated from low-performance Executions

### Appendix B: Scoring Algorithm

The scoring system uses weighted averages at each hierarchy level:

1. Question Score = Approval Value (0-1)
2. Category Score = Σ(Question Score × Question Weight) / Σ(Question Weight)
3. Template Score = Σ(Category Score × Category Weight) / Σ(Category Weight)
4. Group Score = Σ(Template Score × Template Weight) / Σ(Template Weight)

### Appendix C: Future Enhancements

Potential future enhancements include:

- Mobile application for field inspections
- Real-time notifications for incident creation
- Advanced analytics and reporting dashboards
- Integration with external compliance systems
- Workflow automation for incident resolution
- Multi-language support for international operations
