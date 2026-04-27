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

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  durationMin?: number;

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
