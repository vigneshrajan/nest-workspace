import {
  IArmaxViewDataScrapperBlock,
  IArmaxViewDataScrapperDevice,
  IArmaxViewDataScrapperPlant,
  IArmaxViewNotification,
  IArmaxViewParameter,
} from '@armax_cloud/av-models';
import { ObjectId } from 'mongodb';

export class ConfigUtil {
  sanitizePlant = (
    plant: IArmaxViewDataScrapperPlant,
    versionid: string,
  ): IArmaxViewDataScrapperPlant => {
    return {
      ...plant,
      plantid: new ObjectId(plant.plantid),
      organizationid: new ObjectId(plant.organizationid),
      versionid,
    };
  };

  sanitizeBlock = (block: IArmaxViewDataScrapperBlock, versionid: string) => {
    return {
      ...block,
      blockid: new ObjectId(block.blockid),
      plantid: new ObjectId(block.plantid),
      versionid,
    };
  };

  sanitizeBlocks = (
    blocks: IArmaxViewDataScrapperBlock[],
    versionid: string,
  ): IArmaxViewDataScrapperBlock[] => {
    return blocks.map((block) => this.sanitizeBlock(block, versionid));
  };

  sanitizeNotification = (notification: IArmaxViewNotification) => {
    return {
      ...notification,
      _id: new ObjectId(notification._id),
    };
  };

  sanitizeNotifications = (notifications: IArmaxViewNotification[]) => {
    return notifications?.map((notification) =>
      this.sanitizeNotification(notification),
    );
  };

  sanitizeParameter = (parameter: IArmaxViewParameter) => {
    return {
      ...parameter,
      _id: new ObjectId(parameter._id),
      notifications: this.sanitizeNotifications(parameter.notifications ?? []),
    };
  };

  sanitizeParameters = (parameters: IArmaxViewParameter[]) => {
    return parameters.map((parameter) => this.sanitizeParameter(parameter));
  };

  sanitizeDevice = (
    device: IArmaxViewDataScrapperDevice,
    versionid: string,
  ): IArmaxViewDataScrapperDevice => {
    return {
      ...device,
      versionid,
      deviceid: new ObjectId(device.deviceid),
      deviceparentid: device.deviceparentid
        ? new ObjectId(device.deviceparentid)
        : null,
      blockid: new ObjectId(device.blockid),
      parameters: this.sanitizeParameters(device.parameters ?? []),
    };
  };

  sanitizeDevices = (
    devices: IArmaxViewDataScrapperDevice[],
    versionid: string,
  ): IArmaxViewDataScrapperDevice[] => {
    return devices.map((device) => this.sanitizeDevice(device, versionid));
  };
}
