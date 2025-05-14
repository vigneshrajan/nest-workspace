import {
  ComparisionType,
  NotificationType,
  Severity,
} from '@armax_cloud/radiatics-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusRequest } from '../StatusRequest';
import { IArmaxViewNotification } from '@armax_cloud/av-models';

export class AddNotificationRequest implements IArmaxViewNotification {
  @ApiProperty({ type: String })
  _id: string = '';

  @ApiProperty({ type: String })
  notificationname: string = '';

  @ApiProperty({ type: Number })
  notificationtype: number = NotificationType.ALERT;

  @ApiProperty({ type: Number })
  notificationcomparisiontype: number = ComparisionType.EQUAL;

  @ApiProperty({ type: Number })
  notificationseverity: number = Severity.LOW;

  @ApiProperty({
    type: Object,
    oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }],
  })
  notificationvalue: number | string | boolean = 0;

  @ApiProperty({ type: Boolean })
  notificationconvert: boolean = false;

  @ApiPropertyOptional({ type: Number })
  notificationbitposition?: number | undefined;

  @ApiProperty({
    type: Object,
    oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }],
  })
  notificationdefaultvalue: number | string | boolean = 0;

  @ApiProperty({ type: Boolean })
  notificationvirtual: boolean = false;

  @ApiPropertyOptional({ type: String })
  notificationvirtualfunction?: string | undefined;

  @ApiProperty({ type: StatusRequest })
  notificationstatus: StatusRequest = new StatusRequest();

  @ApiPropertyOptional({ type: Number })
  notificationminimumduration?: number = 1;

  @ApiProperty({ type: String })
  notificationdisplayname: string = '';
}
