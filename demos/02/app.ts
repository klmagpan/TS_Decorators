import { Get, Controller, startApp, Injectable, Inject, QueryParameter } from './framework'
import express, {Application, Request, Response} from 'express'

@Injectable('CitiesDB')
class CitiesDB {
  public getCities() {
    console.log('CitiesDB - Getting a list of cities')
    return ['London', 'New York', 'Dublin']
  }
}

// Store a map betwee controller class and route path
@Controller('/api')
class WeatherController {
  @Get('/forecast')
  public get(@QueryParameter('cityName') city: string) {
    return {
      apiVersion: 'v1',
      temperature: 20,
      humidity: 80,
      city: city,
    }
  }
}

@Controller('/api')
class CitiesController {
  @Inject('CitiesDB') // Specify ID
  private citiesDb: CitiesDB // No initializer for 

  @Get('/cities') // Register an HTTP handler using Express.js
  public get() {
    return {
      cities: this.citiesDb.getCities(),
    }
  }
}

startApp()
