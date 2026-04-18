import { IsDateString, IsUUID } from "class-validator";

export class GetSlotsQueryDto {
  @IsDateString()
  date!: string;

  @IsUUID()
  serviceId!: string;
}

