import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";
import { PaymentProvider } from "../../common/enums/payment-provider.enum";

export class CreateCheckoutDto {
  @IsUUID()
  holdId!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(48, 48)
  @Matches(/^[a-f0-9]{48}$/)
  token!: string;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
