import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PaymentPolicy } from "../../common/enums/payment-policy.enum";

export class CreateServiceDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsNumber()
  @IsPositive()
  durationMin!: number;

  @IsOptional()
  @IsEnum(PaymentPolicy)
  paymentPolicy?: PaymentPolicy;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositValue?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
