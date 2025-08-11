/**
 * Status of a flow version
 * DRAFT: Version is being edited and can be modified
 * PUBLISHED: Version is published and immutable, can be used for execution
 * ARCHIVED: Version is archived and cannot be used for new executions
 */
export enum FlowVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
