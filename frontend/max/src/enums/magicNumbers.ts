export enum statusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  ServerError = 500,
}

export enum timeStamp {
  onHour = 60 * 60,
  oneDay = 24 * 60 * 60,
}
