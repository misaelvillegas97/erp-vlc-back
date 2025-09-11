# File-Based Content Storage Design

## Overview

Convert procedure content from inline database storage to file-based storage while maintaining metadata (title, code, description, tags) in the database.

## Content Fields Mapping

### Fields to Convert to Files

1. **purpose** (text) → `purpose.md`
2. **scope** (text) → `scope.md`
3. **responsibilities** (text) → `responsibilities.md`
4. **steps** (jsonb) → `steps.json`
5. **additionalSections** (jsonb) → `additional-sections.json`
6. **risksControls** (jsonb) → `risks-controls.json`
7. **changeSummary** (text) → `change-summary.md`

### Fields to Keep in Database

- Basic metadata: title, code, description, tags, status
- Relationships: procedureId, versionNumber, authorId
- Timestamps: effectiveDate, approvedAt, createdAt, updatedAt
- Boolean flags: isCurrent, affectsInternalRegulation, requiresQuiz
- Simple arrays: legalReferences, annexes, quizQuestions (these contain references, not content)

## File Storage Structure

### Directory Structure

```
files/
├── procedures/
│   └── {tenantId}/
│       └── {procedureId}/
│           └── versions/
│               └── v{versionNumber}/
│                   ├── purpose.md
│                   ├── scope.md
│                   ├── responsibilities.md
│                   ├── steps.json
│                   ├── additional-sections.json
│                   ├── risks-controls.json
│                   └── change-summary.md
```

### File Naming Convention

- Base path: `/files/procedures/{tenantId}/{procedureId}/versions/v{versionNumber}/`
- Content files: Use descriptive names matching the content type
- Extensions: `.md` for text content, `.json` for structured data

## Database Schema Changes

### ProcedureVersionEntity Updates

```typescript
// Remove text/jsonb fields
// @Column({ name: 'purpose', type: 'text', nullable: true })
// purpose?: string;

// Add file path fields
@Column({ name: 'content_base_path', type: 'varchar', length: 500 })
contentBasePath
:
string; // e.g., "/files/procedures/{tenantId}/{procedureId}/versions/v{versionNumber}/"

@Column({ name: 'content_files', type: 'jsonb', default: {} })
contentFiles
:
{
  purpose ? : string;          // "purpose.md"
  scope ? : string;           // "scope.md" 
  responsibilities ? : string; // "responsibilities.md"
  steps ? : string;           // "steps.json"
  additionalSections ? : string; // "additional-sections.json"
  risksControls ? : string;   // "risks-controls.json"
  changeSummary ? : string;   // "change-summary.md"
}
;
```

## File Management Service Interface

### Service Methods

```typescript
interface FileManagerService {
  // Upload content to file
  saveContent(path: string, content: string | object): Promise<void>;

  // Read content from file
  getContent(path: string): Promise<string>;

  getJsonContent(path: string): Promise<object>;

  // Check if file exists
  fileExists(path: string): Promise<boolean>;

  // Delete content file
  deleteContent(path: string): Promise<void>;

  // Copy version files (for version cloning)
  copyVersionFiles(sourcePath: string, targetPath: string): Promise<void>;
}
```

## API Changes

### Content Upload Endpoints

```typescript
// Option 1: Single endpoint with file type parameter
POST / procedures / versions /
:
id / content
Body: {
  type: 'purpose' | 'scope' | 'responsibilities' | 'steps' | 'additionalSections' | 'risksControls' | 'changeSummary', content
:
  string | object
}

// Option 2: Separate endpoints for each content type
POST / procedures / versions /
:
id / content / purpose
POST / procedures / versions /
:
id / content / scope
POST / procedures / versions /
:
id / content / responsibilities
POST / procedures / versions /
:
id / content / steps
POST / procedures / versions /
:
id / content / additional - sections
POST / procedures / versions /
:
id / content / risks - controls
POST / procedures / versions /
:
id / content / change - summary
```

### Content Retrieval

```typescript
GET /procedures/versions/:id/content/:type
// Returns the content as text or JSON depending on type
```

## DTO Updates

### CreateProcedureVersionDto Changes

```typescript
// Remove direct content fields
// purpose?: string;
// scope?: string;
// responsibilities?: string;
// changeSummary?: string;

// Add content upload handling (handled separately through file upload endpoints)
// Content will be uploaded after version creation or through separate endpoints
```

## Migration Strategy

### Phase 1: Implement File System

1. Create FileManagerService
2. Update entities with new file path fields
3. Create migration to add new columns

### Phase 2: Dual Storage (Transition)

1. Save content both in database and files
2. Update services to read from files when available, fallback to database
3. Migrate existing data from database to files

### Phase 3: Remove Database Content

1. Remove old text/jsonb columns from entity
2. Update all services to only use file-based storage
3. Remove database content columns

## Security Considerations

### File Access Control

- Files should only be accessible through API endpoints
- Implement tenant isolation at file system level
- Validate file paths to prevent directory traversal
- Implement file size limits and type validation

### File Storage Security

- Store files outside web root
- Use secure file permissions
- Implement backup strategy for files
- Consider encryption for sensitive content

## Performance Considerations

### Caching Strategy

- Cache frequently accessed content in Redis
- Implement content versioning for cache invalidation
- Use file modification time for cache validation

### File System Optimization

- Use appropriate file system for high I/O operations
- Implement file compression for large content
- Consider CDN for file distribution in multi-region deployments
