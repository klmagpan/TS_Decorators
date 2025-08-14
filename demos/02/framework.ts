import 'reflect-metadata'
import express, { Application, Request, Response } from 'express'

const app: Application = express()

const port: number = 3000

interface RequestHandler {
  controllerCtor: any
  method: string
  subPath: string
}

// Web API: 
const pathForControllerCtor = new Map<any, string>()
const requestHandlers = new Array<RequestHandler>()

// Dependency injection: Store which constructor to use for each ID
const constructorForLabel = new Map<string, any>()

export function Injectable(label: string) { // Store what label was passed to label decorator
  return function (target: any) {
    console.log(
      `@Injectable: Registering an injectable type for label '${label}'`,
    )
    constructorForLabel.set(label, target)
  }
}

export function Inject(name: string) { // Property decorator
  return function (target: any, propertyKey: string) {
    console.log(`@Inject - injecting a value for label '${name}'`)

    let instance: any

    Object.defineProperty(target, propertyKey, {
      set: (newValue: any) => {
        instance = newValue
      },
      get: () => {
        if (!instance) {
          console.log(`@Inject - creating a new instance`)
          const targetCtor = constructorForLabel.get(name) // Find reference to class that should be used for label
          instance = new targetCtor() // Use keyword to create new class
        }

        return instance
      },
    })
  }
}

// Controller decorator factory
export function Controller(urlPath: string) {
  return function (target: any) {
    console.log(`@Controller - Registering a controller for path: ${urlPath}`)
    pathForControllerCtor.set(target, urlPath) // Add a new record to the map
    return target
  }
}

export function Get(subPath: string) {
  return function (target: any, propertyKey: string) {
    console.log(
      `@Get - Registering a GET handler for controller: ${target.constructor.name}`,
    )

    requestHandlers.push({
      controllerCtor: target.constructor,
      method: propertyKey,
      subPath,
    })
  }
}

export function QueryParameter(queryParameterName: string) {
  return function (target: any, methodName: string, parameterIndex: number) {
    console.log(`@QueryParameter - target: ${target}`)
    let parametersMap: Map<number, string> =
      Reflect.getOwnMetadata(
        'queryParameters',
        target.constructor,
        methodName,
      ) || new Map<number, string>()
    parametersMap.set(parameterIndex, queryParameterName)

    Reflect.defineMetadata(
      'queryParameters',
      parametersMap,
      target.constructor,
      methodName,
    )
  }
}

export function startApp() {
  console.log('Starting app')

  // Iterate over list of controller and create an instance
  for (const [controllerCtor, controllerPath] of pathForControllerCtor) {
    console.log(
      `Registering a controller ${controllerCtor.name} for path: ${controllerPath}`,
    )
    const controllerInstance = new controllerCtor()

    const handlers = handlersForController(controllerCtor)

    for (const handler of handlers) {
      const fullPath = `${controllerPath}${handler.subPath}`
      console.log(
        `Registering a handler for method ${handler.method} path: ${fullPath}`,
      )

      app.get(fullPath, (req: Request, res: Response) => {
        const params: any[] = extractHandlerParameters(handler, req)

        console.log(
          `Calling endpoint for path ${fullPath} with parameters: ${params}`,
        )

        const endpointResponse = controllerInstance[handler.method].call(
          controllerInstance,
          ...params,
        )
        res.json(endpointResponse)
      })
    }
  }

  // When web server has started
  app.listen(port, function () {
    console.log(`Started Express server on port ${port}`)
  })
}

function handlersForController(controllerCtor: any) {
  return requestHandlers.filter(
    (targetAndMethod) => targetAndMethod.controllerCtor === controllerCtor,
  )
}

function extractHandlerParameters(handler: RequestHandler, req: Request) {
  const params: any[] = []

  const queryParametersMap: Map<number, string> =
    Reflect.getMetadata(
      'queryParameters',
      handler.controllerCtor,
      handler.method,
    ) || new Map<number, string>()

  const paramsTypes = Reflect.getMetadata(
    'design:paramtypes',
    handler.controllerCtor.prototype,
    handler.method,
  )

  for (let i = 0; i < paramsTypes.length; i++) {
    const queryParamName = queryParametersMap.get(i)
    if (!queryParamName) {
      console.warn(
        `No parameter configured for position ${i} for method ${handler.method}`,
      )
      params.push(undefined)
    } else {
      params.push(req.query[queryParamName])
    }
  }

  return params
}
