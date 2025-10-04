interface ListMapInterface {
  [key: string]: string | undefined
}

export const logLevels = {
  INFO: 0x0,
  WARNING: 0x1,
  ERROR: 0x2,
  HTTP: 0x3,
}

export const logStreams: ListMapInterface = {
  HTTP: 'http',
  SERVICE: 'service',
  ERROR: 'errors'
}

export const getLogStreamLevel = (logLevel: number) => {
  switch (logLevel) {
    case logLevels.ERROR:
      return logStreams.ERROR;
    case logLevels.HTTP:
      return logStreams.HTTP;
    default:
      return logStreams.SERVICE;
  }
}

export default {}