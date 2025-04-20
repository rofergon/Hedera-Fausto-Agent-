import { StructuredTool } from 'langchain/tools';
import { z } from 'zod';

/**
 * Herramienta personalizada para obtener información del clima
 * Ejemplo para demostrar cómo crear herramientas personalizadas con HCS-10
 */
export class WeatherTool extends StructuredTool {
  name = 'get_weather';
  description = 'Obtiene información del clima para una ciudad y país especificados';
  schema = z.object({
    city: z.string().describe('La ciudad para obtener información del clima'),
    country: z.string().optional().describe('El país donde se encuentra la ciudad')
  });

  constructor() {
    super();
  }

  /**
   * Implementación de la herramienta para obtener el clima
   * Esta es una implementación simulada, en un caso real haría una llamada a una API del clima
   */
  async _call({ city, country }) {
    try {
      // En un caso real, aquí llamaríamos a una API externa
      // Por ejemplo: const response = await fetch(`https://weatherapi.com/api/v1/${city},${country}`);
      
      // Simulamos diferentes condiciones climáticas basadas en la primera letra de la ciudad
      const firstLetter = city.charAt(0).toLowerCase();
      let weather, temperature, humidity;
      
      if ('abcde'.includes(firstLetter)) {
        weather = 'Soleado';
        temperature = Math.floor(Math.random() * 10) + 25; // 25-34°C
        humidity = Math.floor(Math.random() * 20) + 40; // 40-59%
      } else if ('fghij'.includes(firstLetter)) {
        weather = 'Nublado';
        temperature = Math.floor(Math.random() * 10) + 15; // 15-24°C
        humidity = Math.floor(Math.random() * 20) + 60; // 60-79%
      } else if ('klmno'.includes(firstLetter)) {
        weather = 'Lluvioso';
        temperature = Math.floor(Math.random() * 10) + 10; // 10-19°C
        humidity = Math.floor(Math.random() * 15) + 80; // 80-94%
      } else if ('pqrst'.includes(firstLetter)) {
        weather = 'Ventoso';
        temperature = Math.floor(Math.random() * 15) + 5; // 5-19°C
        humidity = Math.floor(Math.random() * 30) + 50; // 50-79%
      } else {
        weather = 'Variado';
        temperature = Math.floor(Math.random() * 30) + 0; // 0-29°C
        humidity = Math.floor(Math.random() * 80) + 20; // 20-99%
      }
      
      // Formateamos la respuesta como un string JSON para que el LLM lo pueda utilizar
      const locationStr = country ? `${city}, ${country}` : city;
      return JSON.stringify({
        location: locationStr,
        current: {
          condition: weather,
          temperature: temperature,
          humidity: humidity
        },
        forecast: `En ${locationStr} el clima es ${weather.toLowerCase()} con una temperatura de ${temperature}°C y humedad del ${humidity}%.`
      }, null, 2);
      
    } catch (error) {
      return `Error al obtener el clima para ${city}: ${error.message}`;
    }
  }
} 