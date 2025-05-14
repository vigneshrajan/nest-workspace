import { IArmaxViewAlert, IArmaxViewEvent } from '@armax_cloud/av-models';

export interface IArmaxViewDataScrapperNotificationBase {
  statusonsent?: boolean;
  statusoffsent?: boolean;
}

export interface IArmaxViewDataScrapperNotificationFlagBase {
  isalert?: boolean;
  isevent?: boolean;
  isinternal?: boolean;
}

export interface IArmaxViewDataScrapperAlert
  extends IArmaxViewAlert,
    IArmaxViewDataScrapperNotificationBase {}

export interface IArmaxViewDataScrapperEvent
  extends IArmaxViewEvent,
    IArmaxViewDataScrapperNotificationBase {}

export interface IArmaxViewDataScrapperAlertWithFlag
  extends IArmaxViewDataScrapperAlert,
    IArmaxViewDataScrapperNotificationFlagBase {}

export interface IArmaxViewDataScrapperEventWithFlag
  extends IArmaxViewDataScrapperEvent,
    IArmaxViewDataScrapperNotificationFlagBase {}
