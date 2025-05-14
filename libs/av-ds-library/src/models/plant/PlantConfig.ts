import { PlantType } from '@armax_cloud/radiatics-models';

import {
  ArmaxViewProducts,
  IArmaxViewDataScrapperPlant,
  IArmaxViewPlantMeta,
} from '@armax_cloud/av-models';

import { ApiProperty } from '@nestjs/swagger';
import { TimezoneBase } from '../TimezoneBase';
import { PlantStatusRequest } from './PlantStatusRequest';

export class AddPlantMeta implements IArmaxViewPlantMeta {
  @ApiProperty({ type: () => [String] })
  plantproducts: ArmaxViewProducts[] = [
    ArmaxViewProducts.SCADA,
    ArmaxViewProducts.PPC,
    ArmaxViewProducts.TRACKER,
  ];
}

export class PlantConfig
  implements Omit<IArmaxViewDataScrapperPlant, 'updatedat'>
{
  @ApiProperty({ type: String })
  plantid: string = '';

  @ApiProperty({ type: String })
  organizationid: string = '';

  @ApiProperty({ type: String })
  plantname: string = '';

  @ApiProperty({ type: String })
  plantidentifier: string = '';

  @ApiProperty({ type: () => Number })
  planttype: PlantType = PlantType.SOLAR;

  @ApiProperty({ type: () => PlantStatusRequest })
  plantstatus: PlantStatusRequest = new PlantStatusRequest();

  @ApiProperty({ type: () => TimezoneBase })
  planttimezone: TimezoneBase = new TimezoneBase();

  @ApiProperty({ type: () => String })
  versionid: string = '';

  @ApiProperty({ type: () => AddPlantMeta })
  plantmeta: AddPlantMeta = new AddPlantMeta();
}
