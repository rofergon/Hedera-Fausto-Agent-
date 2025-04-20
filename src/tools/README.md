# Herramientas Personalizadas para Hedera Fausto Agent

Este directorio contiene herramientas personalizadas que extienden la funcionalidad del agente Hedera Fausto.

## Estructura de una Herramienta Personalizada

Las herramientas personalizadas siguen el patrón `StructuredTool` de LangChain, lo que las hace compatibles con el sistema de agentes de LangChain.

Una herramienta personalizada consta de:

1. **name**: Un nombre único que el LLM utilizará para identificar y llamar a la herramienta
2. **description**: Una descripción clara que ayuda al LLM a entender cuándo y cómo utilizar la herramienta
3. **schema**: Un esquema Zod que define los parámetros de entrada de la herramienta
4. **_call**: El método que implementa la funcionalidad principal de la herramienta

## Herramientas Incluidas

Actualmente, este directorio incluye las siguientes herramientas personalizadas:

### WeatherTool

`WeatherTool` simula la obtención de información meteorológica para una ciudad especificada. Esta es una implementación de demostración que genera datos aleatorios basados en la primera letra de la ciudad.

Uso:
```javascript
// En tu código principal
import { WeatherTool } from './tools/customTools.js';

// Crear una instancia
const weatherTool = new WeatherTool();

// Agregar a tus herramientas disponibles
availableTools.push(weatherTool);
```

Invocación por el LLM:
```
get_weather with city: "Madrid", country: "Spain"
```

## Cómo Agregar una Nueva Herramienta Personalizada

Para agregar una nueva herramienta personalizada:

1. **Crear el archivo de la herramienta**:
   - Crea un nuevo archivo `MiHerramienta.js` en el directorio `src/tools/`
   - Extiende la clase `StructuredTool` de LangChain
   - Implementa los métodos requeridos

   ```javascript
   import { StructuredTool } from 'langchain/tools';
   import { z } from 'zod';

   export class MiHerramienta extends StructuredTool {
     name = 'nombre_herramienta';
     description = 'Descripción detallada de la herramienta...';
     schema = z.object({
       parametro1: z.string().describe('Descripción del parámetro'),
       // más parámetros según sea necesario
     });

     constructor() {
       super();
     }

     async _call({ parametro1 }) {
       // Implementación de la funcionalidad
       return 'Resultado en formato string';
     }
   }
   ```

2. **Exportar la herramienta**:
   - Agrega tu herramienta al archivo `src/tools/customTools.js`:
   ```javascript
   export { MiHerramienta } from './MiHerramienta.js';
   ```

3. **Importar y usar la herramienta**:
   - En `src/index.js`, importa tu herramienta:
   ```javascript
   import { MiHerramienta } from './tools/customTools.js';
   ```
   
   - Crea una instancia y agrégala a las herramientas disponibles:
   ```javascript
   const miHerramienta = new MiHerramienta();
   availableTools.push(miHerramienta);
   ```

4. **Actualizar el prompt del sistema**:
   - Asegúrate de incluir información sobre tu nueva herramienta en el prompt del sistema:
   ```javascript
   const prompt = ChatPromptTemplate.fromMessages([
     [
       'system',
       `... instrucciones existentes ...
       - Usar mi nueva herramienta (use nombre_herramienta)
       ...
       Para usar mi herramienta, haz lo siguiente...
       `
     ],
     // resto del prompt
   ]);
   ```

5. **Opcional: Agregar una opción de menú**:
   - Si deseas, puedes agregar una opción en el menú principal para usar tu herramienta directamente

## Mejores Prácticas

- **Nombres claros**: Usa nombres descriptivos y sin ambigüedades
- **Descripciones detalladas**: Proporciona descripciones que expliquen claramente el propósito y uso de la herramienta
- **Manejo de errores**: Siempre maneja los errores para evitar que el agente se bloquee
- **Retornos en formato string**: Las herramientas deben devolver strings, incluso si manejan objetos complejos (usar JSON.stringify)
- **Documentación**: Mantén este README actualizado cuando agregues nuevas herramientas 