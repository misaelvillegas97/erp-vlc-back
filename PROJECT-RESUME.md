# Síntesis General del Proyecto - Sistema de Inventario ERP

## ### Descripción General

Este proyecto es un **sistema ERP de inventario** desarrollado con **NestJS 10**, **PostgreSQL 15** y **TypeORM**, diseñado específicamente para integrarse con proveedores como **Walmart**, **CencosudB2B** y otros. Es un microservicio base que forma parte de
una arquitectura SaaS para gestión de inventario empresarial.

## ### Arquitectura y Tecnologías

### **Stack Tecnológico Principal**

- **Backend**: NestJS 10 con TypeScript
- **Base de Datos**: PostgreSQL 15 con TypeORM
- **Cache**: Redis
- **Autenticación**: JWT con Passport
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest
- **Scraping**: Puppeteer con plugins stealth
- **Comunicación**: Socket.IO para WebSockets
- **Validación**: class-validator + class-transformer

### **Arquitectura Hexagonal**

El proyecto implementa **Arquitectura Hexagonal** (Ports & Adapters) que separa:

- **Dominio**: Lógica de negocio pura
- **Infraestructura**: Persistencia, integraciones externas
- **Aplicación**: Controladores, servicios, DTOs

### **Estructura de Módulos**

```
src/
├── core/                    # Funcionalidades centrales
│   ├── auth/               # Autenticación JWT
│   ├── config/             # Configuraciones
│   ├── database/           # TypeORM setup
│   └── interceptors/       # Interceptores globales
├── modules/                # Módulos de negocio
│   ├── audit/              # Sistema de auditoría
│   ├── checklists/         # Listas de verificación
│   ├── clients/            # Gestión de clientes
│   ├── inventory/          # Gestión de inventario
│   ├── logistics/          # Gestión logística
│   ├── orders/             # Gestión de órdenes
│   ├── products/           # Gestión de productos
│   ├── tracing/            # Trazabilidad de lotes
│   └── [otros módulos]
└── shared/                 # Utilidades compartidas
    ├── decorators/
    ├── mocks/
    └── utils/
```

## ### Módulos Principales

### **1. Módulo de Inventario**

- Gestión de almacenes y ubicaciones
- Control de stock y movimientos
- Alertas de inventario bajo
- Conteos cíclicos y físicos

### **2. Módulo de Órdenes**

- Creación y gestión de órdenes
- Integración con proveedores externos
- Estados de órdenes y seguimiento
- Facturación automática

### **3. Módulo de Trazabilidad** (Nuevo)

- Motor de flujos configurable
- Plantillas versionadas
- Historial inmutable de lotes
- Cálculo de mermas y costos
- Sincronización offline

### **4. Módulo de Auditoría** (Nuevo)

- Logging automático de actividades
- Seguimiento de contexto completo
- Integridad de datos con hashing
- Geolocalización y análisis de seguridad

### **5. Módulo de Logística - Gestión Integral de Flotas**

El **Módulo de Logística** es un sistema completo de gestión de flotas vehiculares que abarca desde el control operativo hasta el mantenimiento preventivo y la gestión de combustible. Está dividido en dos submódulos principales:

#### **5.1 Fleet Management (Gestión de Flota)**

**Gestión de Vehículos:**

- **Registro completo de vehículos**: Marca, modelo, año, placa, VIN, tipo de combustible, capacidad del tanque
- **Estados de vehículos**: Disponible, en uso, mantenimiento, reparación, fuera de servicio, reservado
- **Tipos de vehículos**: Sedán, hatchback, SUV, pickup, van, camión, bus, motocicleta
- **Documentación vehicular**: Seguros, revisión técnica, permisos de circulación con fechas de vencimiento
- **Fotografías**: Almacenamiento de fotos principales y adicionales de vehículos

**Gestión de Conductores:**

- **Perfiles de conductores**: Información personal y profesional
- **Licencias de conducir**: Tipos, fechas de vencimiento, restricciones
- **Asignación de vehículos**: Control de qué conductor puede operar cada vehículo

**Sesiones de Trabajo (Vehicle Sessions):**

- **Inicio/fin de sesiones**: Control de cuando un conductor toma y devuelve un vehículo
- **Seguimiento GPS en tiempo real**: Integración con múltiples proveedores GPS
- **Rutas y ubicaciones**: Registro detallado de trayectorias y paradas
- **Validación de rutas**: Uso de OSRM (Open Source Routing Machine) para validar y optimizar rutas
- **Cálculo automático de distancias**: Medición precisa de kilómetros recorridos

**Mantenimiento Preventivo y Correctivo:**

- **Programación automática**: Mantenimientos basados en tiempo (6 meses) o kilometraje (10,000 km)
- **Tipos de mantenimiento**: Programado, preventivo, correctivo, emergencia
- **Alertas automáticas**: Notificaciones cuando se acerca fecha de mantenimiento
- **Historial completo**: Registro detallado de todos los servicios realizados
- **Proveedores de servicio**: Gestión de talleres y proveedores de mantenimiento
- **Costos y presupuestos**: Control financiero de gastos de mantenimiento

**Dashboards y Reportes:**

- **Sesiones activas**: Monitoreo en tiempo real de vehículos en operación
- **Rendimiento de conductores**: Métricas de eficiencia y comportamiento
- **Análisis geográfico**: Patrones de uso por zonas
- **Utilización de vehículos**: Estadísticas de uso y disponibilidad
- **Cumplimiento y seguridad**: Indicadores de compliance y seguridad vial
- **Análisis histórico**: Tendencias y patrones de uso a largo plazo

#### **5.2 Fuel Management (Gestión de Combustible)**

**Control de Combustible:**

- **Registro de cargas**: Fecha, cantidad de litros, costo, estación de servicio
- **Tipos de combustible**: Gasolina, diésel, gas natural, eléctrico, híbrido
- **Estaciones de servicio**: Copec, Aramco, Shell, YPF, Terpel y otras
- **Odómetro inicial y final**: Control preciso de kilometraje para cálculos

**Análisis de Eficiencia:**

- **Cálculo automático de rendimiento**: Km/litro basado en datos reales
- **Costo por kilómetro**: Análisis financiero del costo operativo
- **Consumo por período**: Reportes diarios, semanales, mensuales
- **Comparativas de eficiencia**: Entre vehículos, conductores y períodos
- **Detección de anomalías**: Identificación de consumos inusuales

**Reportes Financieros:**

- **Gastos de combustible por vehículo**: Análisis individual y comparativo
- **Presupuestos vs. gastos reales**: Control presupuestario
- **Tendencias de precios**: Análisis de variaciones en costos de combustible
- **Optimización de rutas**: Sugerencias para reducir consumo

#### **5.3 Integración con Otros Módulos**

**GPS y Seguimiento:**

- **Integración con módulo GPS**: Seguimiento en tiempo real
- **Múltiples proveedores GPS**: Soporte para diferentes sistemas de tracking
- **Geofencing**: Alertas por entrada/salida de zonas definidas

**Checklists y Auditoría:**

- **Inspecciones vehiculares**: Listas de verificación pre y post uso
- **Auditoría de actividades**: Registro completo de todas las operaciones
- **Incidentes**: Gestión de eventos y accidentes

**Características Técnicas:**

- **Schedulers automáticos**: Tareas programadas para mantenimiento y alertas
- **Event-driven architecture**: Comunicación asíncrona entre módulos
- **Exportación de datos**: Excel, CSV para reportes externos
- **API REST completa**: Endpoints para todas las funcionalidades
- **Documentación Swagger**: API completamente documentada

### **6. Módulo de Checklists**

- Plantillas configurables
- Ejecución con scoring
- Reportes automáticos
- Gestión de incidentes

## ### Integraciones y Características Especiales

### **Integraciones con Proveedores**

- **Walmart**: Scraping automatizado con Puppeteer
- **CencosudB2B**: API REST integrada
- **Otros proveedores**: Arquitectura extensible

### **Características de Seguridad**

- Autenticación JWT multi-proveedor (Google, Facebook, Apple, Twitter)
- Sistema de roles y permisos (RBAC)
- Auditoría completa de actividades
- Rate limiting y throttling
- Helmet para seguridad HTTP

### **Características de Rendimiento**

- Cache con Redis
- Compresión HTTP
- Interceptores de logging
- Paginación optimizada
- Índices de base de datos optimizados

## ### Patrones de Diseño Implementados

### **Repository Pattern**

- Abstracción de acceso a datos
- Mappers para conversión dominio ↔ persistencia
- Soporte para múltiples bases de datos

### **DTO Pattern**

- Validación automática con decoradores
- Transformación de datos
- Documentación automática con Swagger

## ### Configuración y Despliegue

### **Variables de Entorno**

- Configuración por módulos
- Soporte para múltiples entornos
- Validación de configuración

### **Docker Support**

- Dockerfile optimizado
- Docker Compose para desarrollo
- Soporte para contenedores

### **Scripts NPM**

```json
{
  "start:dev": "Desarrollo con hot reload",
  "build": "Compilación TypeScript",
  "test": "Testing con Jest",
  "migration:run": "Migraciones TypeORM",
  "seed:run": "Seeders de datos"
}
```

## ### Estándares de Desarrollo

### **Nomenclatura**

- **PascalCase**: Clases
- **camelCase**: Variables, funciones, métodos
- **kebab-case**: Archivos y directorios
- **UPPERCASE**: Variables de entorno

### **Estructura de Archivos**

- Un export por archivo
- JSDoc para documentación
- Tipado estricto TypeScript
- Validación con class-validator

### **Testing**

- Arrange-Act-Assert para tests
- Mocks para dependencias externas
- Tests unitarios y e2e
- Coverage reporting

## ### Casos de Uso Principales

1. **Gestión de Inventario**: Control completo de stock, movimientos y alertas
2. **Procesamiento de Órdenes**: Desde creación hasta facturación
3. **Trazabilidad de Lotes**: Seguimiento completo de productos
4. **Auditoría y Compliance**: Registro detallado de actividades
5. **Gestión Logística Integral**: Control completo de flotas, combustible, mantenimiento y operaciones vehiculares
6. **Integraciones B2B**: Sincronización con proveedores externos

## ### Próximas Implementaciones

Según los PRDs encontrados, se están desarrollando:

- **Sistema de Trazabilidad** completo con flujos configurables
- **Sistema de Auditoría** avanzado con integridad criptográfica
- Mejoras en **sincronización offline**
- **Dashboards** analíticos avanzados

Este proyecto representa una solución empresarial robusta y escalable para gestión de inventario con capacidades avanzadas de integración, trazabilidad, auditoría y gestión logística integral de flotas vehiculares.
