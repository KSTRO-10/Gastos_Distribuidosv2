# Armado de la Clave Presupuestaria

Esta sección describe cómo se genera la **Clave Presupuestaria** combinando los datos generales de la organización (definidos en la *Plantilla Presupuestal*) con los clasificadores específicos de cada partida (definidos en cada ítem o línea del Excel).

```mermaid
flowchart TD
    Start([Inicio: Configuración de Presupuesto]) --> CreateTemplate[Crear Plantilla Presupuestal]
    CreateTemplate -->|Define datos generales| GeneralData[Entidad Fed., Clasificador Adm., No. Municipio, Unidad Adm., Ejercicio Fiscal]
    GeneralData --> Import[Importar Claves desde Excel / Capturar Manualmente]
    Import --> Process[Procesar cada línea de la Plantilla]
    Process -->|Obtener Clasificadores Específicos| ItemClassifiers[Unidad Ejecutora, COG, Programa Presupuestario, Fuente Fin., etc.]
    ItemClassifiers -->|Concatenar| BudgetKey[Clave Presupuestaria Armada]
    subgraph FinalKey["Estructura Final de la Clave (Cadena completa)"]
        direction LR
        K1[Datos de la Plantilla] --> K2[+]
        K2 --> K3[Datos del Ítem / Clasificadores]
    end
    BudgetKey --> Save[(Guardar en Base de Datos)]
    Save --> End([Fin: Claves listas para uso en requisiciones])
```

**Explicación del armado:**

- **Plantilla Presupuestal:** El administrador crea una plantilla por año, definiendo campos estáticos (Ejercicio Fiscal, Entidad Federativa, Unidad Administrativa, etc.).
- **Ítems / Claves (Importación):** Se cargan los clasificadores específicos (COG, Fuente de financiamiento, Acción, etc.) normalmente a través de un archivo de Excel.
- **Clave Armada:** El sistema toma los prefijos de la plantilla y los concatena con los valores del ítem para generar la clave presupuestaria completa que se asignará al presupuesto.
