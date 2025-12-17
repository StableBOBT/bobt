# Investigación: APIs Bancarias Bolivia - Automatización de Depósitos y Retiros

**Fecha:** 16 de Diciembre, 2025
**Proyecto:** BOBT Stablecoin
**Objetivo:** Automatizar on-ramp/off-ramp BOB ↔ BOBT

---

## Resumen Ejecutivo

Esta investigación analiza las APIs bancarias y de pagos disponibles en Bolivia para automatizar depósitos y retiros de bolivianos (BOB) en el ecosistema BOBT. Se evaluaron sistemas gubernamentales, bancos privados, billeteras móviles y alternativas P2P.

### Hallazgos Clave

1. **OpenBCB** (BCB) es la infraestructura más prometedora - lanzada octubre 2025
2. **No existe Open Banking regulado** tipo PSD2 en Bolivia todavía
3. **BCP Bolivia** tiene APIs abiertas disponibles, requiere registro
4. **QR Simple BCB** es el estándar oficial para pagos QR
5. **Soluciones P2P** (Binance, Bybit, Bitget) son las únicas actualmente viables sin partnerships bancarios
6. **Screen scraping** es legal pero riesgoso - no recomendado
7. **Regulación ASFI 2025** introduce licenciamiento fintech y requisitos KYC/AML estrictos

---

## 1. Open Banking en Bolivia

### Estado Actual: EN DESARROLLO

Bolivia **NO tiene Open Banking regulado** similar a PSD2 de Europa o UK. Sin embargo, hay avances significativos:

#### OpenBCB (Banco Central de Bolivia) 🆕 **OCTUBRE 2025**

**Descripción:**
- Herramienta tecnológica gratuita basada en APIs
- Diseñada para facilitar pagos electrónicos con QR
- Enfocada en instituciones con limitaciones presupuestarias

**Funcionalidades:**
- ✅ Generación gratuita de códigos QR
- ✅ Consulta del estado de operaciones en tiempo real
- ✅ Procesamiento ágil de órdenes de pago
- ✅ Notificación automática de transacciones sin costo
- ✅ Integración con payment gateways
- ✅ Integración con bancos comerciales
- ✅ Interoperabilidad garantizada

**Marco Legal:**
- Ley No. 1670 del Banco Central de Bolivia
- Reglamento de Cuentas de Liquidación Transitorias

**Alcance Estimado:**
- 100,000+ usuarios
- ~30 instituciones
- Especial impacto en áreas peri-urbanas y rurales

**Integración con Fintechs:**
- El BCB planea integrar OpenBCB con empresas fintech
- Expandirá alcance y digitalización de pagos

**Requisitos para Acceso:**
- Solicitud escrita firmada por máxima autoridad de la entidad
- Documentación requerida (publicada en sitio web BCB)
- Proceso de registro formal

**Para BOBT:**
```
✅ Relevancia: ALTA
💡 Uso: Generación de QR para depósitos, webhooks para confirmación
⚠️  Acción: Solicitar acceso oficial al BCB
```

**Fuentes:**
- [Banco Central de Bolivia lanza OpenBCB para pagos con QR](https://mobiletime.la/noticias/20/10/2025/bolivia-lanza-openbcb/)
- [Payment Media - OpenBCB](https://www.paymentmedia.com/news-7650-banco-central-de-bolivia-lanza-openbcb-para-impulsar-pagos-con-qr.html)

---

### QR Simple (Sistema de Pagos QR del BCB)

**Descripción:**
- QR oficial del Estado Plurinacional de Bolivia
- Esquema desarrollado por BCB
- QR estandarizado y universal para todo el sistema financiero

**Características:**
- Código de barras bidimensional con toda la información de pago
- Contiene: nombre beneficiario, número de cuenta, entidad financiera
- Transferencias y pagos rápidos, simples y seguros
- Lectura/escaneo vía dispositivo móvil

**Estado:**
- ✅ Operativo en todo el sistema bancario boliviano
- ✅ Integrado con todos los bancos principales
- ✅ Estándar oficial del BCB

**Para BOBT:**
```
✅ Relevancia: ALTA
💡 Uso: Método principal para depósitos BOB
⚠️  Acción: Integrar con OpenBCB para generación de QR
```

**Fuentes:**
- [Pagos QR BCB Bolivia](https://www.bcb.gob.bo/?q=pagos_qr_bcb_bolivia)

---

### Adopción de Criptomonedas (Contexto Regulatorio)

**Noviembre 2025 - Anuncio Histórico:**
- Bolivia integrará oficialmente criptomonedas y stablecoins al sistema financiero formal
- Decreto Supremo 5384 (Mayo 2025) estableció marco legal

**Estadísticas:**
- Transacciones cripto aumentaron 12x entre Julio 2024 y Mayo 2025
- 10,193 operaciones valoradas en +$88 millones
- 86% son transferencias de usuarios individuales
- Binance y USDT de Tether son los rails dominantes

**Para BOBT:**
```
✅ Relevancia: MUY ALTA
💡 Contexto: Marco regulatorio favorable para stablecoins
🎯 Oportunidad: BOBT está bien posicionado en momento estratégico
```

**Fuentes:**
- [Bolivia Makes Historic Move to Integrate Crypto](https://bravenewcoin.com/insights/bolivia-makes-historic-move-to-integrate-crypto-and-stablecoins-into-banking-system)

---

## 2. Bancos Principales

### BCP - Banco de Crédito de Bolivia ⭐ **DISPONIBLE**

**Información General:**
- 4to banco más grande de Bolivia por activos
- Subsidiaria de Banco de Crédito del Perú
- 102 sucursales, 240 ATMs

**Portal de Desarrolladores:**
- 🌐 **URL:** https://www.bcp.com.bo/Desarrollo
- 📄 **Documentación:** Disponible mediante formulario de registro
- 🔧 **API de Pagos QR Simple:** https://www.bcp.com.bo/Desarrollo/ApiPagosQR

**Proceso de Integración:**
1. Llenar formulario en sitio web
2. Recibir documentación técnica
3. Integraciones robustas, escalables y flexibles

**APIs Disponibles:**
- ✅ Pagos QR Simple
- ✅ Transferencias
- ✅ Consulta de saldo
- ⚠️  Webhooks: Por confirmar en documentación

**Open Banking:**
- BCP ha implementado Azure API Management
- Evaluando soluciones CIAM para banca
- Trabaja en adopción de Open Banking

**App Móvil - Características:**
- Apertura de cuenta USDT
- Solicitud de tarjeta prepagada
- Notificaciones automáticas de depósitos
- Consulta de saldos
- Pagos QR
- Transferencias
- Pago de servicios

**Para BOBT:**
```
✅ Relevancia: MUY ALTA
💡 Uso: API principal para QR, posible sandbox
⚠️  Acción: Registrarse y obtener documentación completa
📝 Prioridad: INMEDIATA
```

**Fuentes:**
- [Apis abiertas - BCP Bolivia](https://www.bcp.com.bo/Desarrollo)

---

### BNB - Banco Nacional de Bolivia

**Información General:**
- Fundado en 1870 - uno de los más antiguos
- Red extensa de sucursales en todo Bolivia
- Reconocido por soluciones de banca digital

**Portal de APIs:**
- 🌐 **URL:** https://www.bnb.com.bo/PortalBNB/Api/AllApis
- 📄 **Documentación:** Disponible para integración QR Simple

**APIs Disponibles:**
- ✅ Pagos QR Simple
- ✅ Recepción de pagos
- ⚠️  Detalles técnicos requieren registro

**Estado:**
- Portal de APIs público
- Documentación disponible para partners
- Proceso de integración formal

**Para BOBT:**
```
✅ Relevancia: ALTA
💡 Uso: Alternativa/complemento a BCP
⚠️  Acción: Contactar para documentación
📝 Prioridad: MEDIA
```

**Fuentes:**
- [Banco Nacional de Bolivia - Portal APIs](https://www.bnb.com.bo/PortalBNB/Api/AllApis)

---

### Banco Mercantil Santa Cruz (BMSC)

**Información General:**
- Uno de los bancos más grandes de Bolivia
- Fundado en 1980, sede en Santa Cruz
- Fuerte inversión en tecnología

**APIs:**
- ❌ **No se encontró portal público de desarrolladores**
- ⚠️  Probablemente requiere contacto directo

**Para BOBT:**
```
⚠️  Relevancia: MEDIA
💡 Acción: Contactar división de banca corporativa
📝 Prioridad: BAJA
```

---

### Banco Unión

**Información General:**
- Banco estatal fundado en 2009
- Enfoque en inclusión financiera
- Líder en innovación y soluciones digitales

**APIs:**
- ❌ **No se encontró portal público de desarrolladores**
- ⚠️  Probablemente requiere contacto directo

**Para BOBT:**
```
⚠️  Relevancia: MEDIA
💡 Acción: Contactar soporte técnico/business development
📝 Prioridad: BAJA
```

---

### Banco Bisa ⭐ **SERVICIOS CRIPTO**

**Información General:**
- 4to banco comercial más grande de Bolivia
- Pionero en servicios cripto

**Servicios USDT (Octubre 2024):**
- ✅ Custodia de USDT
- ✅ Compra/venta de USDT
- ✅ Transferencias directas desde cuentas bancarias
- 💰 Fees: $5-$15 por transacción

**Impacto:**
- Volumen mensual de trading cripto aumentó 100%
- Alcanzó $48.6 millones a finales de 2024

**Para BOBT:**
```
✅ Relevancia: MUY ALTA
💡 Uso: Posible partnership para on-ramp directo
🎯 Oportunidad: Ya tienen infraestructura USDT
⚠️  Acción: Contactar para integración comercial
📝 Prioridad: ALTA
```

**Fuentes:**
- [Stablecoin On/Off-Ramps for Bolivian Businesses](https://www.muralpay.com/blog/stablecoin-on-off-ramps-for-bolivian-businesses-what-you-need-to-know)

---

## 3. Billeteras Móviles

### Tigo Money ⭐ **APIs DISPONIBLES**

**Información General:**
- Principal billetera móvil de Bolivia
- Operada por Tigo (Millicom)
- Amplia red de agentes

**APIs Disponibles:**

#### 1. PHP Client Library
- 📦 **GitHub:** [saulmoralespa/tigo-money-api-php](https://github.com/saulmoralespa/tigo-money-api-php)
- 🔑 **Requiere:** API_KEY, API_SECRET
- 🧪 **Sandbox:** Disponible

**Configuración:**
```php
Client(
  api_key: "unique_client_identifier",
  api_secret: "secret_password",
  sandbox_mode: true/false
)
```

#### 2. WooCommerce Plugin
- 🛒 **Plugin:** Woo TigoMoney Gateway
- 🎯 **Uso:** Integración para WordPress/WooCommerce
- 🧪 **Testing:** Modo sandbox disponible

**Requisitos:**
- ⚠️  Cuenta Business de Tigo Money (cuenta regular no sirve)
- 📝 Registro formal con Tigo Money
- 🔑 Credenciales API durante el proceso de registro

#### 3. Partner Integration API
- 📄 **Protocolo:** XML over HTTP
- 🔄 **Casos de uso:**
  - Wallet a Account (usuario → partner)
  - Account a Wallet (partner → usuario)

**APIs Disponibles:**
- `SYNC_BILLPAY_API` - Pagos desde wallet de usuario
- `MFI CashIn API` - Transferencias de partner a usuario

**Estado de Webhooks:**
- ⚠️  No se encontró documentación específica de webhooks
- Probablemente requiere contacto directo

**Para BOBT:**
```
✅ Relevancia: ALTA
💡 Uso: Alternativa para depósitos/retiros BOB
⚠️  Requisito: Partnership con Tigo Money
⚠️  Acción: Aplicar para cuenta Business
📝 Prioridad: MEDIA-ALTA
```

**Fuentes:**
- [GitHub - vevende/woo-gateway-tigomoney](https://github.com/vevende/woo-gateway-tigomoney)
- [GitHub - saulmoralespa/tigo-money-api-php](https://github.com/saulmoralespa/tigo-money-api-php)
- [TigoPesa Partner Integration Guide](https://tigopesa-docs.netlify.app/partner_integration/)

---

### Simple (BCP Bolivia)

**Información General:**
- Billetera digital de Banco de Crédito de Bolivia
- App móvil completa

**Funcionalidades:**
- P2P transfers
- Pagos de servicios
- Pagos QR
- Recargas móviles

**APIs:**
- ✅ Probablemente disponible vía portal BCP Desarrollo
- ⚠️  Verificar en documentación completa de BCP

**Para BOBT:**
```
✅ Relevancia: ALTA
💡 Uso: Integración combinada con APIs de BCP
⚠️  Acción: Verificar en registro con BCP
📝 Prioridad: MEDIA (depende de BCP)
```

---

### SoliPagos (BCP)

**Información General:**
- E-wallet de Banco de Crédito de Bolivia
- Solución versátil

**Funcionalidades:**
- Pagos
- Gestión de cuentas
- Transferencias seguras
- Integración con QR para pagos contactless

**Para BOBT:**
```
✅ Relevancia: MEDIA
💡 Nota: Probablemente parte del ecosistema BCP
📝 Prioridad: BAJA (incluido en BCP)
```

---

### Otras Billeteras Digitales

**Pago Móvil:**
- Sistema de pagos instantáneos
- QR codes
- Sin APIs públicas conocidas

**$imple (ASOBAN):**
- Plataforma de Asociación de Bancos Privados
- Transferencias instantáneas vía QR
- Inter-bancario
- Sin APIs públicas conocidas

**VPay:**
- Pagos en tiempo real vía QR
- Desde billeteras móviles
- Sin APIs públicas conocidas

---

## 4. Caso de Uso BOBT: Requisitos Técnicos

### Detectar Depósitos Entrantes (Webhooks)

**Opciones Disponibles:**

#### A) OpenBCB (Recomendado) ⭐
```
✅ API oficial del BCB
✅ "Notificación automática de transacciones sin costo"
✅ Consulta del estado en tiempo real
⚠️  Requiere: Registro formal con BCB
```

**Flujo:**
1. Usuario solicita depósito en BOBT
2. Sistema genera QR vía OpenBCB
3. Usuario paga con app bancaria
4. **OpenBCB notifica vía webhook** ← CLAVE
5. Sistema detecta pago y mintea BOBT

#### B) BCP API con Polling
```
⚠️  Si webhooks no disponibles en BCP
📊 Polling cada 30-60 segundos
💡 Usar reference ID único por transacción
```

#### C) Tigo Money Webhooks
```
⚠️  Documentación no clara
💡 Requiere contacto directo con Tigo
```

**Estado General de Webhooks:**
- ✅ **OpenBCB:** Notificaciones automáticas confirmadas
- ⚠️  **BCP:** Por confirmar en documentación
- ⚠️  **Tigo Money:** Requiere investigación directa
- ❌ **Otros bancos:** No documentado públicamente

**Fuentes:**
- [Webhooks | Enable Banking](https://enablebanking.com/docs/api/webhooks/)
- [Real-Time Webhooks for Financial Data | Dwolla](https://www.dwolla.com/features/webhooks)

---

### Verificar Pagos QR

**Estándar QR Simple BCB:**

**Estructura de QR:**
```json
{
  "type": "QR_SIMPLE",
  "version": "1.0",
  "merchantId": "BOBT-001",
  "merchantName": "BOBT Exchange",
  "amount": 100.00,
  "currency": "BOB",
  "reference": "BOBT-TXN-123456",
  "timestamp": 1702742400000
}
```

**Verificación:**
1. Generar QR con reference único
2. Usuario escanea y paga
3. Sistema recibe webhook de OpenBCB
4. Verificar reference y monto
5. Actualizar estado de transacción

**Implementación Actual en BOBT:**
```typescript
// /packages/stellar/src/bolivia/payments.ts
generateQRPayment(
  amount: number,
  reference: string,
  merchantName: string = 'BOBT Exchange'
): QRPaymentData
```

**Para Producción:**
```
⚠️  Actualmente usa formato mock
✅ Migrar a especificación oficial BCB
✅ Integrar con OpenBCB para QR real
```

---

### Iniciar Transferencias Salientes (Off-ramp)

**Opciones:**

#### A) OpenBCB API (Recomendado)
```
✅ "Procesamiento ágil de órdenes de pago"
✅ Integración con bancos comerciales
⚠️  Requiere: Licencia de operación fintech
```

**Flujo Off-ramp:**
1. Usuario solicita retiro BOBT → BOB
2. Usuario proporciona cuenta bancaria
3. Sistema quema BOBT
4. **Sistema inicia transferencia vía OpenBCB**
5. Usuario recibe BOB en cuenta

#### B) Partnership con Banco (Ej: Banco Bisa)
```
✅ Banco ya maneja USDT
💡 Posible acuerdo comercial directo
⚠️  Requiere: Negociación comercial
```

#### C) Tigo Money API
```
✅ API disponible para partner → wallet
💡 Usuario recibe en Tigo Money
⚠️  Requiere: Partnership
```

**Desafío Principal:**
```
⚠️  Iniciar transferencias requiere:
   - Licencia fintech ASFI
   - Partnership bancario, O
   - Cuenta business en plataforma de pagos
```

---

### KYC/AML Requerimientos

**Marco Regulatorio ASFI 2025:**

#### Circular ASFI/885/25

**Requisitos para ETF (Empresas de Tecnología Financiera):**

1. **Documentación Técnica:**
   - Actualizada y completa
   - Arquitectura de sistemas
   - Protocolos de seguridad

2. **KYC (Know Your Customer):**
   - Registro formal ante UIF (Unidad de Investigaciones Financieras)
   - Aplicación de procedimientos KYC
   - Monitoreo de operaciones
   - Reporte de transacciones sospechosas
   - Políticas de debida diligencia basada en riesgo

3. **AML (Anti-Money Laundering):**
   - Protocolos robustos de prevención
   - Todos los PSAV (Proveedores de Servicios de Activos Virtuales) deben cumplir
   - Supervisión de UIF
   - Verificaciones obligatorias

4. **Seguridad:**
   - ISO 27001
   - NIST
   - PCI DSS
   - Auditoría y ciberseguridad

#### Licenciamiento

**Categorías Reguladas:**
- Pagos y plataformas de pagos ← **BOBT APLICA AQUÍ**
- Plataformas de financiamiento
- Tecnologías empresariales
- Proveedores de Servicios de Activos Virtuales (PSAV)

**Requisitos de Licencia:**
- ✅ Requisitos operativos, financieros, técnicos, documentales
- ✅ Estructura societaria
- ✅ Capital exigido por ASFI
- ✅ Planes de mitigación de riesgos
- ✅ Protocolos de seguridad

**Plazo de Adecuación:**
- 📅 **31 de Diciembre 2025** - Deadline para adecuación
- 209 empresas identificadas por ASFI
  - 176 PSAV (mayoría personas naturales)
  - 33 plataformas de pago

#### Para BOBT:

**Nivel de Compliance Requerido:**
```
🔴 CRÍTICO - Obligatorio para operar legalmente

Acciones Inmediatas:
[ ] Registrarse como ETF ante ASFI
[ ] Implementar procedimientos KYC:
    - Verificación de identidad (CI/Pasaporte)
    - Comprobante de domicilio
    - Verificación facial (liveness)
    - Validación contra listas PEP/Sanciones
[ ] Implementar procedimientos AML:
    - Monitoreo de transacciones
    - Límites por usuario
    - Detección de patrones sospechosos
    - Sistema de reportes a UIF
[ ] Registrarse ante UIF
[ ] Documentar arquitectura técnica
[ ] Preparar auditoría de seguridad
[ ] Establecer estructura societaria
[ ] Capital mínimo requerido

Plazo: ANTES del 31 Diciembre 2025
```

**Implementación Técnica KYC:**
```typescript
interface KYCData {
  // Datos Personales
  fullName: string;
  dateOfBirth: Date;
  nationality: string;
  documentType: 'CI' | 'Passport';
  documentNumber: string;
  documentExpiry: Date;

  // Verificación
  documentFrontImage: string; // base64 o URL
  documentBackImage: string;
  selfieImage: string;
  livenessVerified: boolean;

  // Domicilio
  address: string;
  city: string;
  country: string;
  proofOfAddressDocument: string;

  // Screening
  isPEP: boolean; // Politically Exposed Person
  isSanctioned: boolean;
  riskLevel: 'low' | 'medium' | 'high';

  // Auditoría
  verifiedAt: Date;
  verifiedBy: string;
  kycProvider?: string; // Ej: "Onfido", "Sumsub"
}

interface TransactionMonitoring {
  userId: string;
  dailyVolume: number;
  monthlyVolume: number;
  dailyLimit: number;
  monthlyLimit: number;
  suspiciousPatterns: string[];
  reportedToUIF: boolean;
}
```

**Proveedores KYC Recomendados:**
- Onfido (global)
- Sumsub (LATAM presence)
- Veriff
- Jumio

**Fuentes:**
- [Reglamento para Empresas de Tecnología Financiera – ASFI](https://redtiseg.com/reglamento-para-empresas-de-tecnologia-financiera-asfi/)
- [ASFI regula a las Fintech en Bolivia](https://emba.com.bo/autoridad-de-supervision-del-sistema-financiero-asfi-regula-a-las-fintech-en-bolivia/)
- [ASFI regula 209 fintech en Bolivia](https://eldeber.com.bo/economia/asfi-regula-209-fintech-en-bolivia-alertan-que-norma-puede-frenar-inversiones_521885/)

---

## 5. Alternativas si No Hay APIs Directas

### A) Screen Scraping ❌ **NO RECOMENDADO**

**Qué es:**
- Automatización de login a banca online
- Parsing de datos de transacciones
- Recolección de información sin API oficial

**Riesgos Legales:**

1. **Violación de Términos de Servicio:**
   - Mayoría de bancos prohíben acceso automatizado
   - Posible bloqueo de IP
   - Posible acción legal

2. **Seguridad:**
   - Requiere almacenar credenciales de usuario
   - Alto riesgo de brechas de datos
   - Responsabilidad por transacciones no autorizadas

3. **Confiabilidad:**
   - Cualquier cambio en UI rompe el scraper
   - No hay SLA ni soporte
   - Difícil de mantener

4. **Compliance:**
   - Problemas con auditorías de seguridad
   - Violación de estándares PCI DSS
   - Riesgo reputacional

**Marco Legal:**
- Computer Fraud and Abuse Act (CFAA) en US
- Trespass to chattels
- Violación de propiedad intelectual
- Problemas de privacidad de datos

**Contexto Bolivia:**
- Sin regulación específica sobre screen scraping
- Ley 393 de Servicios Financieros cubre banca electrónica
- ASFI requiere métodos seguros
- UIF supervisa actividades sospechosas

**Conclusión:**
```
❌ NO USAR screen scraping
✅ USAR APIs oficiales
✅ ESPERAR por Open Banking si es necesario
✅ PARTNERSHIP con instituciones financieras
```

**Fuentes:**
- [Is Screen Scraping Legal? A Practical Compliance Guide](https://www.promptcloud.com/blog/is-screen-scraping-legal/)
- [Screen Scraping: What Is It and How Does It Work?](https://bpi.com/screen-scraping-what-is-it-and-how-does-it-work/)
- [How Open Banking May Affect the Legality of Screen Scraping](https://clsbluesky.law.columbia.edu/2021/05/07/how-open-banking-may-affect-the-legality-of-screen-scraping/)

---

### B) Proveedores de Pagos Intermediarios ✅ **VIABLE**

#### CUCU ⭐ **DISPONIBLE**

**Descripción:**
- Fintech boliviana certificada
- API de facturación electrónica
- API de QR Simple
- Proveedor autorizado por Impuestos Nacionales

**APIs Disponibles:**

1. **API QR:**
   - 📄 **Docs:** https://docs.cucu.bo/qr/
   - 🔑 **Auth:** JWT via POST login
   - 🧪 **Sandbox:** `https://qrsandbox.cucu.bo/api/v1/login/auth`

**Configuración QR:**
```typescript
{
  currency: 'BOB',
  amount: number,
  singleUse: boolean,
  expirationDate: Date,
  additionalData: object
}
```

2. **API de Facturación:**
   - Certificado por SIN (Servicio de Impuestos Nacionales)
   - Firma Digital (ADSIB/DigiCert)
   - Facturación en línea validada

**Integración con BCB:**
- Compatible con QR Simple BCB
- Facilita distribución de API de Facturación

**Para BOBT:**
```
✅ Relevancia: MUY ALTA
💡 Uso: Proveedor intermediario para QR
✅ Ventaja: Ya certificado y operativo
⚠️  Acción: Contactar CUCU para partnership
📝 Prioridad: ALTA
🔗 Posible combinación con OpenBCB
```

**URLs:**
- Sitio: https://cucu.bo
- Docs: https://docs.cucu.bo
- API QR: https://docs.cucu.bo/qr/

**Fuentes:**
- [API QR | CUCU](https://docs.cucu.bo/qr/)
- [Quienes somos | cucu API Rest](https://cucu.bo/quienes-somos)

---

#### EBANX - Pagosnet

**Descripción:**
- Gateway de pagos internacional
- Soporte para Bolivia vía Pagosnet
- Sandbox disponible

**Pagosnet:**
- Método de pago tipo voucher
- Red de puntos de cobro en Bolivia
- Pagos de servicios, utilities, etc.

**API:**
- 🧪 Sandbox y Production environments
- 📄 Documentación completa
- 🔧 Endpoint: `ws/direct`

**Testing:**
- Mock customer data
- Error codes para troubleshooting
- Seleccionar Bolivia en API Reference

**Limitaciones:**
```
⚠️  Pagosnet es principalmente para pagos de servicios
⚠️  No está diseñado para transferencias P2P
💡 Puede servir para casos específicos
```

**Para BOBT:**
```
⚠️  Relevancia: BAJA-MEDIA
💡 Uso: Posible para pagos de servicios BOBT
📝 Prioridad: BAJA
```

**Fuentes:**
- [Pagosnet integration through EBANX Direct API](https://docs.ebanx.com/docs/payments/guides/accept-payments/api/bolivia/pagosnet/)

---

#### Mural Pay 🌟

**Descripción:**
- Especializado en stablecoins para empresas bolivianas
- On/off-ramp USDT/USDC

**Servicios:**
- Conversión bolivianos ↔ stablecoins
- Conversión USD ↔ stablecoins
- Enfocado en negocios

**Para BOBT:**
```
✅ Relevancia: ALTA
💡 Uso: Posible white-label o partnership
🎯 Ya resuelven problema similar
⚠️  Acción: Contactar para alianza estratégica
📝 Prioridad: MEDIA-ALTA
```

**Fuentes:**
- [Stablecoin On/Off-Ramps for Bolivian Businesses - Mural](https://www.muralpay.com/blog/stablecoin-on-off-ramps-for-bolivian-businesses-what-you-need-to-know)

---

### C) Soluciones P2P Manuales con Verificación ✅ **IMPLEMENTADO**

**Estado Actual en BOBT:**

La implementación actual usa soluciones P2P:

#### Exchanges P2P Soportados:
1. **Binance P2P** ⭐ Más popular
2. **Bybit P2P**
3. **Bitget P2P**

#### Flujo Actual:

**On-ramp (BOB → BOBT):**
1. Usuario solicita cotización
2. Sistema consulta precios de CriptoYa
3. Usuario recibe instrucciones:
   - Abrir exchange P2P
   - Comprar USDT con BOB
   - Transferir USDT a wallet Stellar
   - Mintear BOBT vía Trade Widget
4. **Manual, requiere múltiples pasos**

**Off-ramp (BOBT → BOB):**
1. Usuario quema BOBT vía Trade Widget
2. Recibe USDT en wallet
3. Abre exchange P2P
4. Vende USDT por BOB
5. **Manual, requiere múltiples pasos**

#### Implementación Técnica:

```typescript
// /packages/stellar/src/bolivia/payments.ts
class BoliviaPayments {
  // Fetch precios de CriptoYa
  async getExchangePrice(exchange: 'binance' | 'bybit' | 'bitget')

  // Mejor precio para comprar USDT
  async getBestBuyPrice()

  // Mejor precio para vender USDT
  async getBestSellPrice()

  // Cotización on-ramp
  async createOnRampQuote(bobAmount, paymentMethod)

  // Cotización off-ramp
  async createOffRampQuote(bobtAmount, paymentMethod)
}
```

#### Ventajas:
```
✅ Funciona AHORA sin APIs bancarias
✅ Sin requisitos de licencias (usuario opera directo)
✅ Liquidez garantizada (exchanges grandes)
✅ Precios competitivos
✅ Sin riesgo de compliance para BOBT
```

#### Desventajas:
```
❌ Experiencia de usuario fragmentada
❌ Requiere cuenta en exchange
❌ Múltiples pasos manuales
❌ Tiempo de operación más largo
❌ Usuario debe tener KYC en exchange
```

#### Mejoras Posibles:

**A) Deep Links a Exchanges:**
```typescript
// Abrir directamente sección P2P
const binanceP2PLink = `https://p2p.binance.com/trade/BOB?
  fiat=BOB&
  crypto=USDT&
  amount=${amount}&
  payment=ALL`
```

**B) Integración con APIs de Exchange:**
```
⚠️  Binance tiene API P2P (requiere partnership)
⚠️  Bybit tiene API de trading
💡 Posible automatización parcial
```

**C) Agregador de Órdenes:**
```
💡 Mostrar mejores órdenes P2P en tiempo real
💡 Usuario selecciona vendedor
💡 BOBT facilita matching
```

**Para BOBT:**
```
✅ Solución ACTUAL funcionando
💡 Iterar y mejorar UX
🎯 Usar mientras se desarrollan APIs bancarias
📝 Mantener como fallback siempre
```

---

## 6. Documentación Técnica y Sandboxes

### Disponibles Ahora:

| Proveedor | Documentación | Sandbox | Estado |
|-----------|---------------|---------|--------|
| **OpenBCB (BCB)** | Requiere registro | ⚠️ TBD | Solicitar acceso |
| **BCP Bolivia** | Via formulario | ⚠️ TBD | Registrarse en portal |
| **BNB** | Portal APIs | ⚠️ TBD | Contactar banco |
| **CUCU** | ✅ docs.cucu.bo/qr | ✅ qrsandbox.cucu.bo | DISPONIBLE |
| **Tigo Money** | Requiere partnership | ⚠️ TBD | Aplicar cuenta business |
| **EBANX (Pagosnet)** | ✅ docs.ebanx.com | ✅ Disponible | DISPONIBLE |
| **CriptoYa** | ✅ API pública | ✅ Producción | YA INTEGRADO |

### Para Investigar:

1. **OpenBCB:**
   - Visitar bcb.gob.bo
   - Descargar requisitos de registro
   - Preparar documentación societaria
   - Enviar solicitud formal

2. **BCP Desarrollo:**
   - Ir a bcp.com.bo/Desarrollo
   - Llenar formulario de contacto
   - Esperar documentación técnica
   - Probar en sandbox (si disponible)

3. **CUCU:**
   - ✅ Documentación ya disponible
   - Probar sandbox inmediatamente
   - Contactar para términos comerciales

---

## 7. Roadmap de Implementación

### Fase 1: INMEDIATO (1-2 semanas)

**Objetivo:** Mejorar solución P2P actual

```
[ ] Deep links a Binance/Bybit/Bitget P2P
[ ] Mostrar mejores órdenes disponibles
[ ] Tutorial paso a paso con screenshots
[ ] Tracking de conversión de usuarios
[ ] Soporte en vivo para ayuda
```

### Fase 2: CORTO PLAZO (1-2 meses)

**Objetivo:** Integrar CUCU + Preparar OpenBCB

```
[ ] Integrar CUCU API QR
    [x] Sandbox testing
    [ ] Producción
    [ ] Webhook de confirmación
[ ] Preparar documentación para OpenBCB
    [ ] Registro societario
    [ ] Documentación técnica
    [ ] Plan de seguridad
    [ ] Enviar solicitud al BCB
[ ] Implementar KYC básico
    [ ] Seleccionar proveedor (Onfido/Sumsub)
    [ ] Integrar SDK
    [ ] UI de verificación
    [ ] Storage de documentos
```

### Fase 3: MEDIANO PLAZO (2-4 meses)

**Objetivo:** OpenBCB en producción + Compliance

```
[ ] Implementar OpenBCB API
    [ ] QR generation
    [ ] Webhooks
    [ ] Confirmación de pagos
    [ ] Testing con usuarios beta
[ ] Licenciamiento ASFI
    [ ] Registrar ETF
    [ ] Registrar ante UIF
    [ ] Preparar auditoría
    [ ] Capital requerido
[ ] KYC/AML completo
    [ ] Screening PEP/Sanciones
    [ ] Monitoreo transaccional
    [ ] Reportes a UIF
    [ ] Límites por usuario
```

### Fase 4: LARGO PLAZO (4-8 meses)

**Objetivo:** Partnerships + Automatización completa

```
[ ] Partnership con Banco Bisa
    [ ] Negociación comercial
    [ ] Integración técnica USDT
    [ ] Cuenta treasury
    [ ] Liquidación automática
[ ] Integrar BCP APIs
    [ ] Transferencias automáticas
    [ ] Webhooks
    [ ] Reconciliación
[ ] Tigo Money partnership
    [ ] Cuenta business
    [ ] API integration
    [ ] Testing
[ ] Escalabilidad
    [ ] Procesamiento de alto volumen
    [ ] Multi-banco
    [ ] Redundancia
```

### Fase 5: EXPANSIÓN (8+ meses)

```
[ ] Otros bancos (BNB, BMSC, Banco Unión)
[ ] Billeteras adicionales (Simple, VPay)
[ ] Cross-border payments
[ ] API pública de BOBT
[ ] White-label para negocios
```

---

## 8. Análisis de Riesgos

### Riesgos Técnicos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| OpenBCB no acepta BOBT | Alto | Media | Backup: CUCU, BCP directo |
| APIs bancarias sin webhooks | Medio | Media | Polling, notificaciones push |
| Rate limits en CriptoYa | Bajo | Baja | Cache, múltiples fuentes |
| Cambios en APIs sin avisar | Medio | Media | Versionado, tests automáticos |

### Riesgos Regulatorios

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| No obtener licencia ASFI | Crítico | Baja | Contratar legal, compliance proactivo |
| Deadline 31 Dic 2025 | Alto | Media | Iniciar proceso YA |
| Cambios en regulación | Medio | Alta | Monitoring continuo, flexibilidad |
| Auditoría UIF | Alto | Media | Sistemas robustos desde día 1 |

### Riesgos de Negocio

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Bancos rechazan partnership | Alto | Media | Múltiples opciones simultáneas |
| Competencia (Mural Pay) | Medio | Alta | Diferenciación, velocidad |
| Adopción lenta de usuarios | Alto | Media | UX excelente, marketing |
| Costos de compliance | Medio | Alta | Presupuesto adecuado, inversión |

### Riesgos Operacionales

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Fraude de usuarios | Alto | Media | KYC robusto, límites, monitoring |
| Falta de liquidez BOB | Alto | Baja | Treasury management, P2P backup |
| Downtime de APIs bancarias | Medio | Media | Fallbacks, status page |
| Problemas de reconciliación | Alto | Media | Sistemas automáticos, auditoría |

---

## 9. Costos Estimados

### Setup Inicial

| Item | Costo (USD) | Notas |
|------|-------------|-------|
| **Licencia ASFI** | $5,000 - $15,000 | Proceso completo, legal |
| **KYC Provider (Onfido/Sumsub)** | $0.50 - $2 por verificación | + setup fee $1,000 |
| **Legal/Compliance** | $10,000 - $20,000 | Abogados, auditoría inicial |
| **Desarrollo** | $15,000 - $30,000 | Integraciones, KYC, webhooks |
| **Capital Requerido ASFI** | TBD | Depende de categoría |
| **Total Estimado** | **$31,500 - $68,000+** | Sin contar capital |

### Costos Mensuales

| Item | Costo (USD/mes) | Notas |
|------|-----------------|-------|
| **KYC** | $500 - $2,000 | Depende de volumen |
| **APIs/Integraciones** | $0 - $500 | Algunos gratis, otros paid |
| **Compliance Officer** | $2,000 - $4,000 | Tiempo parcial/completo |
| **Hosting/Infrastructure** | $200 - $500 | Cloud, monitoring |
| **Soporte/Operaciones** | $1,000 - $3,000 | Atención al cliente |
| **Total Mensual** | **$3,700 - $10,000** | |

### Fees por Transacción

| Tipo | Fee Estimado | Notas |
|------|--------------|-------|
| **OpenBCB** | **GRATIS** | Costo $0 según anuncio |
| **QR Simple** | Gratis - 0.5% | Depende de banco |
| **Tigo Money** | 1% - 2% | Típico para billeteras |
| **P2P Exchange** | 0% - 0.1% | Usuario paga spread |
| **BOBT Platform Fee** | 0.5% | Como implementado |

---

## 10. Recomendaciones Finales

### Estrategia Recomendada: **HÍBRIDA**

#### Corto Plazo (0-3 meses):
```
1. ✅ Mantener y mejorar solución P2P actual
   - Deep links
   - Mejor UX
   - Tutorial interactivo

2. 🟡 Integrar CUCU API
   - Sandbox testing
   - QR generation
   - Producción gradual

3. 🟡 Iniciar proceso ASFI
   - Contratar legal
   - Preparar documentos
   - Enviar solicitud
```

#### Mediano Plazo (3-6 meses):
```
1. 🟢 OpenBCB en producción
   - QR automático
   - Webhooks
   - Depósitos automáticos

2. 🟢 KYC/AML completo
   - Onfido/Sumsub
   - Screening
   - Monitoring

3. 🟡 BCP API integration
   - Documentación
   - Testing
   - Producción
```

#### Largo Plazo (6-12 meses):
```
1. 🟢 Partnerships bancarios
   - Banco Bisa (USDT directo)
   - BCP (transferencias)
   - Otros bancos

2. 🟢 Tigo Money
   - Business account
   - API integration

3. 🟢 Automatización 100%
   - Depósitos: QR → auto-mint
   - Retiros: Burn → auto-transfer
```

### Priorización de Integraciones:

**Nivel 1 - CRÍTICO (Próximos 3 meses):**
1. **OpenBCB** - Oficial, gratis, escalable
2. **CUCU** - Disponible ahora, bridge a OpenBCB
3. **Licencia ASFI** - Requisito legal

**Nivel 2 - ALTO (3-6 meses):**
1. **BCP API** - Banco grande, APIs documentadas
2. **KYC Provider** - Compliance obligatorio
3. **Banco Bisa Partnership** - Ya manejan USDT

**Nivel 3 - MEDIO (6-12 meses):**
1. **Tigo Money** - Cobertura amplia
2. **BNB API** - Banco histórico
3. **Otros bancos**

**Nivel 4 - BAJO (12+ meses):**
1. BMSC, Banco Unión
2. Billeteras adicionales
3. Cross-border

### Warnings Importantes:

```
⚠️  NO usar screen scraping bajo ninguna circunstancia
⚠️  NO operar sin licencia ASFI después del 31 Dic 2025
⚠️  NO lanzar automatización sin KYC/AML robusto
⚠️  NO almacenar datos sensibles sin encriptación
⚠️  NO ignorar reportes a UIF
```

### Success Metrics:

**Q1 2026:**
- [ ] Licencia ASFI obtenida
- [ ] OpenBCB integrado
- [ ] 100 usuarios con KYC completo
- [ ] $10,000 volumen mensual

**Q2 2026:**
- [ ] 500 usuarios activos
- [ ] $50,000 volumen mensual
- [ ] 2+ bancos integrados
- [ ] NPS > 50

**Q3-Q4 2026:**
- [ ] 2,000+ usuarios
- [ ] $200,000+ volumen mensual
- [ ] Automatización completa
- [ ] Break-even operativo

---

## 11. Recursos Adicionales

### Contactos Clave:

**Reguladores:**
- ASFI: https://www.asfi.gob.bo
- UIF: Unidad de Investigaciones Financieras
- BCB: https://www.bcb.gob.bo

**Bancos:**
- BCP Bolivia: https://www.bcp.com.bo/Desarrollo
- BNB: https://www.bnb.com.bo
- Banco Bisa: (contacto comercial)

**Fintechs:**
- CUCU: https://cucu.bo / docs.cucu.bo
- Mural Pay: https://www.muralpay.com
- Tigo Money: https://money.tigo.com.bo

**Proveedores KYC:**
- Onfido: https://onfido.com
- Sumsub: https://sumsub.com
- Veriff: https://www.veriff.com

### Documentación:

**Open Banking:**
- [OpenBCB Announcement](https://www.bcb.gob.bo/?q=content/el-banco-central-de-bolivia-lanza-openbcb-para-ampliar-el-uso-de-pagos-electr%C3%B3nicos-con-qr)
- [Pagos QR BCB](https://www.bcb.gob.bo/?q=pagos_qr_bcb_bolivia)

**Regulatorio:**
- [Reglamento ETF - ASFI](https://redtiseg.com/reglamento-para-empresas-de-tecnologia-financiera-asfi/)
- [Ley 393 - Servicios Financieros](https://servdmzw.asfi.gob.bo/circular/Leyes/Ley393ServiciosFinancieros.pdf)

**APIs:**
- [BCP Desarrollo](https://www.bcp.com.bo/Desarrollo)
- [CUCU API Docs](https://docs.cucu.bo)
- [EBANX Bolivia](https://docs.ebanx.com)

---

## 12. Conclusiones

### Estado Actual del Ecosistema:

**Positivo:**
- ✅ OpenBCB lanzado (Oct 2025) - game changer
- ✅ Marco regulatorio para crypto favorable
- ✅ QR Simple BCB estándar establecido
- ✅ BCP y BNB tienen APIs públicas
- ✅ CUCU disponible como intermediario
- ✅ Banco Bisa ya maneja USDT
- ✅ Regulación ASFI clara (aunque estricta)

**Desafíos:**
- ⚠️  Open Banking real aún no existe
- ⚠️  Mayoría de bancos sin APIs públicas
- ⚠️  Webhooks no confirmados en todos
- ⚠️  Compliance costoso y complejo
- ⚠️  Deadline ASFI en 2 semanas (31 Dic 2025)
- ⚠️  Partnerships requieren negociación

### Viabilidad de BOBT:

**✅ 100% VIABLE con enfoque híbrido:**

**Ahora (Fase P2P):**
- Solución P2P funciona
- Mejoras UX incrementales
- Sin barreras regulatorias

**3-6 meses (Fase Semi-Automática):**
- CUCU para QR
- OpenBCB si es aprobado
- KYC/AML básico
- Licencia ASFI en proceso

**6-12 meses (Fase Automática):**
- OpenBCB completamente integrado
- Partnerships bancarios
- Depósitos/retiros automáticos
- Compliance robusto

**12+ meses (Fase Escalada):**
- Multi-banco
- Multi-billetera
- White-label
- Expansión regional

### Next Steps Inmediatos:

**Esta Semana:**
```
[ ] Decidir: ¿Buscar licencia ASFI o operar via partnerships?
[ ] Registrarse en BCP Desarrollo
[ ] Contactar CUCU para términos
[ ] Contratar abogado especializado en fintech Bolivia
[ ] Mejorar UX de solución P2P actual
```

**Este Mes:**
```
[ ] Preparar solicitud OpenBCB
[ ] Integrar CUCU sandbox
[ ] Diseñar flujo KYC
[ ] Evaluar proveedores KYC
[ ] Documentar arquitectura técnica
[ ] Preparar pitch para Banco Bisa
```

**Próximos 3 Meses:**
```
[ ] Obtener licencia ASFI (o partnership)
[ ] OpenBCB en producción
[ ] KYC básico implementado
[ ] BCP API integrado
[ ] 100 usuarios beta
```

---

## Fuentes Completas

### Open Banking & BCB:
- [Banco Central de Bolivia lanza OpenBCB para pagos con QR](https://mobiletime.la/noticias/20/10/2025/bolivia-lanza-openbcb/)
- [Payment Media - OpenBCB](https://www.paymentmedia.com/news-7650-banco-central-de-bolivia-lanza-openbcb-para-impulsar-pagos-con-qr.html)
- [BCB - OpenBCB Official](https://www.bcb.gob.bo/?q=content/el-banco-central-de-bolivia-lanza-openbcb-para-ampliar-el-uso-de-pagos-electr%C3%B3nicos-con-qr)
- [Pagos QR BCB Bolivia](https://www.bcb.gob.bo/?q=pagos_qr_bcb_bolivia)

### Bancos:
- [Apis abiertas - BCP Bolivia](https://www.bcp.com.bo/Desarrollo)
- [APIs Pagos QR Simple - BCP](https://www.bcp.com.bo/Desarrollo/ApiPagosQR)
- [Banco Nacional de Bolivia - Portal APIs](https://www.bnb.com.bo/PortalBNB/Api/AllApis)

### Fintechs:
- [API QR | CUCU](https://docs.cucu.bo/qr/)
- [Quienes somos | CUCU](https://cucu.bo/quienes-somos)
- [CUCU DOCS](https://docs.cucu.bo)

### Billeteras Móviles:
- [GitHub - woo-gateway-tigomoney](https://github.com/vevende/woo-gateway-tigomoney)
- [GitHub - tigo-money-api-php](https://github.com/saulmoralespa/tigo-money-api-php)
- [TigoPesa Partner Integration Guide](https://tigopesa-docs.netlify.app/partner_integration/)

### Crypto & Stablecoins:
- [Bolivia Makes Historic Move to Integrate Crypto](https://bravenewcoin.com/insights/bolivia-makes-historic-move-to-integrate-crypto-and-stablecoins-into-banking-system)
- [Stablecoin On/Off-Ramps for Bolivian Businesses - Mural](https://www.muralpay.com/blog/stablecoin-on-off-ramps-for-bolivian-businesses-what-you-need-to-know)
- [Bolivia to integrate crypto, stablecoins](https://cointelegraph.com/news/bolivia-integrate-crypto-stablecoins-financial-system)

### Regulación & Compliance:
- [Reglamento para Empresas de Tecnología Financiera – ASFI](https://redtiseg.com/reglamento-para-empresas-de-tecnologia-financiera-asfi/)
- [ASFI regula a las Fintech en Bolivia](https://emba.com.bo/autoridad-de-supervision-del-sistema-financiero-asfi-regula-a-las-fintech-en-bolivia/)
- [ASFI regula 209 fintech](https://eldeber.com.bo/economia/asfi-regula-209-fintech-en-bolivia-alertan-que-norma-puede-frenar-inversiones_521885/)
- [Nueva regulación de activos virtuales](https://emba.com.bo/nueva-regulacion-de-activos-virtuales-en-bolivia-entidades-publicas-podran-usar-criptoactivos-para-realizar-pagos-a-proveedores-en-moneda-extranjera/)

### Screen Scraping:
- [Is Screen Scraping Legal?](https://www.promptcloud.com/blog/is-screen-scraping-legal/)
- [Screen Scraping: What Is It? - Bank Policy Institute](https://bpi.com/screen-scraping-what-is-it-and-how-does-it-work/)
- [How Open Banking May Affect Screen Scraping](https://clsbluesky.law.columbia.edu/2021/05/07/how-open-banking-may-affect-the-legality-of-screen-scraping/)

### Payment Gateway:
- [Pagosnet integration - EBANX](https://docs.ebanx.com/docs/payments/guides/accept-payments/api/bolivia/pagosnet/)

### Webhooks:
- [Webhooks | Enable Banking](https://enablebanking.com/docs/api/webhooks/)
- [Real-Time Webhooks - Dwolla](https://www.dwolla.com/features/webhooks)
- [Payment methods in Bolivia - NORBr](https://norbr.com/library/payworldtour/payment-methods-in-bolivia/)

---

**Documento preparado por:** BOBT Research Team
**Fecha:** 16 de Diciembre, 2025
**Versión:** 1.0
**Proyecto:** BOBT Stablecoin

---

*Este documento debe ser revisado y actualizado periódicamente a medida que el ecosistema fintech boliviano evoluciona.*
