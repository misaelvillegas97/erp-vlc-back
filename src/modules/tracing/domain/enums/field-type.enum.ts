/**
 * Type of dynamic field in forms
 * TEXT: Single line text input
 * NUMBER: Numeric input with validation
 * DATE: Date picker input
 * BOOLEAN: Checkbox or toggle
 * SELECT: Single selection dropdown
 * MULTI_SELECT: Multiple selection dropdown
 * USER: Single user selector
 * MULTI_USER: Multiple user selector
 * FILE: File upload field
 * TEXTAREA: Multi-line text input
 */
export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  USER = 'USER',
  MULTI_USER = 'MULTI_USER',
  FILE = 'FILE',
  TEXTAREA = 'TEXTAREA',
}
