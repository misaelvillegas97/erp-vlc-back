export interface UserRequest {
  id: string;
  role: { id: number, name: string };
  tenantId?: string;
}
