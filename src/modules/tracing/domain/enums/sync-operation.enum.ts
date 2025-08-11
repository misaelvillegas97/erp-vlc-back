/**
 * Type of synchronization operation for offline sync
 * CREATE: Entity was created locally and needs to be synced to server
 * UPDATE: Entity was updated locally and needs to be synced to server
 * DELETE: Entity was deleted locally and needs to be synced to server
 */
export enum SyncOperation {
  CREATE = 'C',
  UPDATE = 'U',
  DELETE = 'D',
}
