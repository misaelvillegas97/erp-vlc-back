import { ApiProperty } from '@nestjs/swagger';

export class TopTicketCreatorDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty()
  count: number;
}

export class TicketStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byType: Record<string, number>;

  @ApiProperty({ type: [TopTicketCreatorDto] })
  topCreators: TopTicketCreatorDto[];
}
