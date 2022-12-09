export enum Status {
  INACTIVE,
  ACTIVE,
}

export enum InfoType {
  PERSONAL = 1,
  ROOM
}

export interface IBotInfo {
  type: InfoType
  status: Status
  memo: boolean
}
