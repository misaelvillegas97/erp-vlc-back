import { PartialType }     from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * DTO for updating an existing tenant.
 * Extends CreateTenantDto but makes all fields optional using PartialType.
 */
export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  // All fields from CreateTenantDto are now optional for updates
}
