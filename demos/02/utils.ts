function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type RetryOptions = {
  maxRetryAttempts: number
  delayMs: number
}

// Decorator factory
function retry<This, Args extends any[], Return>(retryOptions: RetryOptions) {
  // Decorator function
  return function (
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return>
    >,
  ): (this: This, ...args: Args) => Promise<Return> {
    console.log('Applying retry decorator')

    // New method that implements retries
    const resultMethod = async function (this: This, ...args: Args): Promise<Return> {
      console.log('@retry - Running the retry decorator')
      let lastError = undefined
      for (
        let attemptNum = 1;
        attemptNum <= retryOptions.maxRetryAttempts;
        attemptNum++
      ) {
        try {
          console.log(`@retry - Attempt #${attemptNum}`)
          return await target.apply(this, args)
        } catch (error) {
          lastError = error
          if (attemptNum < retryOptions.maxRetryAttempts) {
            console.log('@retry - Retrying...')
            await sleep(retryOptions.delayMs)
          }
        }
      }

      throw lastError
    }

    return resultMethod
  }
}

function log<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Promise<Return>,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Promise<Return>
  >,
): (this: This, ...args: Args) => Promise<Return> {
  const resultMethod = async function (this: This, ...args: Args): Promise<Return> {
    console.log(`@log - Running the ${context.name.toString()} method`)
    try {
      return await target.apply(this, args)
    } finally {
      console.log(`@log - Method ${context.name.toString()} finished`)
    }
  }

  return resultMethod
}

class Metric {
  constructor(public name: string) {}

  // Method returning a decorator
  time() {
    const metricThis = this
    // Decorator
    return function (target: any, context: any) {
      // New method that captures time metric
      const resultMethod = async function (this: any, ...args: any[]) {
        const start = Date.now()

        try {
          return await target.apply(this, args)
        } finally {
          const end = Date.now()
          const timeMs = end - start

          console.log(
            `@time - Metric ${metricThis.name} value ${timeMs}ms to execute`,
          )
        }
      }

      return resultMethod
    }
  }
}

function createMetric(name: string) {
  return new Metric(name)
}

const weatherTiming = createMetric('weather.timing')

function logAndRetry<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Promise<Return>,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Promise<Return>
  >,
):  (this: This, ...args: Args) => Promise<Return> {
  const retryFactory = retry<This, Args, Return>({ maxRetryAttempts: 4, delayMs: 500 })
  const targetWithRetries = retryFactory(target, context)
  const ret = log(targetWithRetries, context)
  return ret
}

class WeatherAPI {
  apiVersion: string = 'v1'

  @weatherTiming.time()
  @logAndRetry
  async getWeather(city: string) {
    console.log(`Getting weather for ${city}`)

    if (Math.random() < 0.75) throw new Error('Something went wrong')
    return {
      apiVersion: this.apiVersion,
      temperature: 20,
      humidity: 80,
      city: city,
    }
  }
}

async function main() {
  const weatherAPI = new WeatherAPI()
  console.log(await weatherAPI.getWeather('London'))
}

main().catch(console.error)
