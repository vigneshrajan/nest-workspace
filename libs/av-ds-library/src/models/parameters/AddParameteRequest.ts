import { AggregateType, DataType } from '@armax_cloud/radiatics-models';
import {
  ArmaxViewProducts,
  IArmaxViewParameter,
  IArmaxViewParameterMeta,
} from '@armax_cloud/av-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusRequest } from '../StatusRequest';
import { AddNotificationRequest } from '../notifications/AddNotificationRequest';
import { AddParameterMetaRequest } from './AddParameterMetaRequest';

export class AddPatameterScadameta implements IArmaxViewParameterMeta {
  @ApiProperty({ type: () => [String] })
  parameterproducts: ArmaxViewProducts[] = [
    ArmaxViewProducts.SCADA,
    ArmaxViewProducts.PPC,
    ArmaxViewProducts.TRACKER,
  ];
}

export class AddParameteRequest implements IArmaxViewParameter {
  @ApiProperty({ type: String })
  _id: string = '';

  @ApiProperty({ type: String })
  parametername: string = '';

  @ApiProperty({ type: Number })
  parameterdatatype: DataType = DataType.NONE;

  @ApiPropertyOptional({ type: Number })
  parametermin?: number;

  @ApiPropertyOptional({ type: Number })
  parametermax?: number;

  @ApiProperty({ type: Boolean })
  parameterread: boolean = true;

  @ApiProperty({ type: Boolean })
  parameterwrite: boolean = false;

  @ApiProperty({ type: () => AddParameterMetaRequest })
  parametermeta: AddParameterMetaRequest = new AddParameterMetaRequest();

  @ApiProperty({ type: () => StatusRequest })
  parameterstatus: StatusRequest = new StatusRequest();

  @ApiPropertyOptional({ type: String })
  parameterfunction?: string | undefined;

  @ApiProperty({ type: Boolean })
  parametervirtual: boolean = false;

  @ApiPropertyOptional({ type: String })
  parametervirtualfunction?: string | undefined;

  @ApiPropertyOptional({ type: Number })
  parameterscalingfactor?: number;

  @ApiProperty({ type: Number })
  parameteraggregatetype: number = AggregateType.AVERAGE;

  @ApiProperty({ type: Boolean })
  parameterhold: boolean = false;

  @ApiProperty({ type: () => [AddNotificationRequest] })
  notifications: AddNotificationRequest[] = [new AddNotificationRequest()];

  @ApiPropertyOptional({ type: Boolean })
  parameterdisplay?: boolean | undefined;

  @ApiProperty({ type: () => AddPatameterScadameta })
  parameterscadameta: AddPatameterScadameta = new AddPatameterScadameta();

  @ApiProperty({ type: String })
  parameterdisplayname: string;

  @ApiProperty({ type: Number })
  parametersortorder: number;

  @ApiPropertyOptional({ type: String })
  parameterunit?: string;

  @ApiPropertyOptional({ type: Number })
  parametervalueoffset?: number;
}
