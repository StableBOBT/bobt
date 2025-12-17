# BOBT Stablecoin - Arquitectura Técnica

## Modelo de Estabilidad

### Principio Fundamental

BOBT es una stablecoin **1:1 con el Boliviano (BOB)**, respaldada por reservas reales en cuentas bancarias bolivianas. A diferencia de stablecoins algorítmicas (como UST), BOBT sigue el modelo probado de **fiat-collateralized**.

```
1 BOBT = 1 BOB (siempre redimible)
```

### Flujo de Valor

```
┌─────────────────────────────────────────────────────────────────┐
│                        MINT (On-Ramp)                           │
│  Usuario deposita BOB → Treasury verifica → Mint BOBT          │
│                                                                 │
│  BOB (banco) ────────► Treasury Account ────────► BOBT (chain) │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       BURN (Off-Ramp)                           │
│  Usuario quema BOBT → Treasury verifica → Transfiere BOB       │
│                                                                 │
│  BOBT (burn) ────────► Treasury verifica ────────► BOB (banco) │
└─────────────────────────────────────────────────────────────────┘
```

### Garantía de Paridad

1. **100% Colateralizado**: Por cada BOBT en circulación, hay 1 BOB en la cuenta Treasury
2. **Redención Garantizada**: Cualquier holder puede redimir BOBT por BOB
3. **Verificación On-Chain**: Total supply visible y auditable en Stellar

---

## Mecanismos Anti-Depeg

### 1. Arbitraje Natural

Si BOBT cotiza < 1 BOB en mercados secundarios:
- Arbitrajistas compran BOBT barato
- Redimen en Treasury por 1 BOB
- Ganancia = (1 - precio mercado) BOB

Si BOBT cotiza > 1 BOB:
- Arbitrajistas depositan BOB en Treasury
- Reciben BOBT a par (1:1)
- Venden BOBT en mercado por > 1 BOB

### 2. Rate Limits (Circuit Breakers)

```rust
// Configuración por defecto
daily_mint_limit: 10,000,000 BOBT   // Máximo mint diario
daily_burn_limit: 10,000,000 BOBT   // Máximo burn diario
single_op_limit:  1,000,000 BOBT    // Máximo por operación
```

Estos límites previenen:
- Bank runs (retiros masivos)
- Ataques de manipulación
- Errores de operador

### 3. Multi-Sig Treasury

Todas las operaciones de mint/burn requieren aprobación multi-sig:

```
Threshold: 2 de 3 firmantes mínimo
Proceso:
1. Signer A propone mint/burn
2. Signer B aprueba
3. Cualquier signer ejecuta
```

### 4. Oracle de Precios (Para Referencia)

El Oracle P2P no afecta la paridad 1:1, pero sirve para:
- Mostrar tipo de cambio BOB/USD paralelo
- Detectar anomalías del mercado
- Alertas si el precio P2P se desvía significativamente

```
Fuentes: Binance P2P, Bybit P2P, Bitget P2P
Actualización: Cada 5 minutos
Staleness: 15 minutos máximo
```

### 5. Pause de Emergencia

El contrato puede pausarse ante:
- Detección de exploit
- Problemas con reservas bancarias
- Eventos de mercado extremos

```rust
// Solo PAUSER_ROLE puede pausar
token.pause(pauser);
// Cuando pausado, no se permiten transfers, mints ni burns
```

---

## Riesgos y Mitigaciones

### Riesgo: Insuficiencia de Reservas

**Causa**: Treasury no tiene suficiente BOB para cubrir redenciones
**Mitigación**:
- Auditorías regulares de cuentas bancarias
- Proof of reserves publicado periódicamente
- Rate limits previenen redención masiva instantánea

### Riesgo: Bloqueo de Cuenta Bancaria

**Causa**: Regulador boliviano congela cuenta Treasury
**Mitigación**:
- Múltiples cuentas en diferentes bancos
- Operaciones dentro del marco legal boliviano
- Estructura legal clara para la operación

### Riesgo: Ataque al Oracle

**Causa**: Manipulación de precios P2P reportados
**Mitigación**:
- Oracle solo es informativo, no afecta mint/burn
- Agregación de múltiples fuentes
- Máxima desviación de 5% entre updates

### Riesgo: Pérdida de Keys de Operador

**Causa**: Compromiso de llaves privadas de signers
**Mitigación**:
- Multi-sig requiere múltiples firmantes
- Hardware wallets para signers en producción
- Proceso de rotación de signers

---

## Diferencias con Otras Stablecoins

### vs UST (Algorítmica) - FALLIDA

| Aspecto | UST | BOBT |
|---------|-----|------|
| Respaldo | Algoritmo + LUNA | 100% BOB en banco |
| Depeg risk | Alto (death spiral) | Bajo (siempre redimible) |
| Complejidad | Alta | Baja |

### vs USDC (Fiat-backed)

| Aspecto | USDC | BOBT |
|---------|------|------|
| Moneda base | USD | BOB |
| Reservas | Bonos + cash | Cash en banco |
| Regulación | USA (Circle) | Bolivia (local) |
| Mercado | Global | Bolivia + Latam |

### vs Tether (USDT)

| Aspecto | USDT | BOBT |
|---------|------|------|
| Transparencia | Cuestionada | On-chain + auditable |
| Reservas | Mixto | 100% BOB |
| Redención | Mínimo $100k | Sin mínimo |

---

## Caso Especial: Bolivia

### Tipo de Cambio Paralelo

Bolivia tiene control de cambios, resultando en:
- **Oficial**: ~6.96 BOB/USD (fijo)
- **Paralelo**: ~8-10 BOB/USD (mercado P2P)

BOBT usa el precio **paralelo** como referencia porque:
1. Refleja el valor real de mercado
2. Los usuarios acceden a BOB a precio paralelo
3. El tipo oficial no está disponible para operaciones crypto

### Marco Legal

- Crypto no está prohibido en Bolivia (zona gris)
- ASFI no regula crypto directamente
- Operamos como servicio de tecnología financiera
- KYC/AML siguiendo estándares internacionales

---

## Flujo Técnico Detallado

### On-Ramp (BOB → BOBT)

```
1. Usuario solicita compra de X BOBT
2. Sistema calcula: X BOBT = X BOB (1:1) + fee
3. Usuario recibe instrucciones de pago:
   - Cuenta: Treasury Bank Account
   - Referencia: BOBT-XXXXXXXX
   - Monto: X + fee BOB
4. Usuario transfiere BOB
5. Operador verifica depósito en banco
6. Operador crea proposal en Treasury
7. Multi-sig aprueba (2/3)
8. Treasury ejecuta mint
9. Usuario recibe BOBT en wallet
```

### Off-Ramp (BOBT → BOB)

```
1. Usuario solicita venta de X BOBT
2. Sistema calcula: X BOBT = X BOB (1:1) - fee
3. Usuario quema BOBT (firma tx)
4. Sistema detecta burn on-chain
5. Operador verifica burn en blockchain
6. Operador inicia transferencia BOB
7. Usuario recibe BOB en cuenta bancaria
```

---

## Métricas de Salud

### Indicadores Clave

| Métrica | Healthy | Warning | Critical |
|---------|---------|---------|----------|
| Reservas vs Supply | >100% | 95-100% | <95% |
| Oracle Staleness | <15min | 15-30min | >30min |
| Daily Volume vs Limit | <50% | 50-80% | >80% |
| Pending Requests | <10 | 10-50 | >50 |

### Dashboard de Monitoreo

El dashboard muestra en tiempo real:
- Total Supply BOBT
- Precio Oracle (P2P)
- Volumen 24h
- Estado del Oracle
- Solicitudes pendientes

---

## Próximos Pasos para Producción

1. **Auditoría de Contratos**: Revisión por terceros
2. **Legal**: Estructura corporativa y compliance
3. **Cuentas Bancarias**: Múltiples bancos bolivianos
4. **KYC/AML**: Sistema de verificación de usuarios
5. **Mainnet Deploy**: Después de testnet exhaustivo
6. **Liquidez Inicial**: Seed reserves en Treasury

---

*Documento técnico - BOBT Stablecoin - Diciembre 2025*
