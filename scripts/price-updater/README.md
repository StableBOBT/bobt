# BOBT Price Updater

Actualiza el Oracle de BOBT con precios P2P de BOB/USDT desde CriptoYa.

## Flujo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Binance P2P │     │  Bybit P2P  │     │ Bitget P2P  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   CriptoYa API  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Price Updater  │  ← Este script
                  │  (cada 15 min)  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Oracle Contract │  (Soroban)
                  └─────────────────┘
```

## Instalación

```bash
cd scripts/price-updater
npm install
```

## Configuración

```bash
# Copiar template
cp .env.example .env

# Editar con tus valores
nano .env
```

Variables requeridas:

| Variable | Descripción |
|----------|-------------|
| `NETWORK` | `testnet` o `mainnet` |
| `ORACLE_CONTRACT_ID` | Dirección del contrato Oracle |
| `STELLAR_SECRET_KEY` | Secret key del operador autorizado |

## Uso Local

```bash
# Ejecutar una vez
npm run update-prices

# Desarrollo (watch mode)
npm run dev

# Build para producción
npm run build
npm start
```

## GitHub Actions (Automático)

El workflow se ejecuta cada 15 minutos automáticamente.

### Configurar Secrets

1. Ve a tu repo en GitHub → Settings → Secrets → Actions
2. Agrega estos secrets:

| Secret | Valor |
|--------|-------|
| `STELLAR_SECRET_KEY` | `S...` (secret key del operador) |
| `ORACLE_CONTRACT_ID` | `C...` (dirección del contrato) |

### Ejecutar Manualmente

GitHub → Actions → "Update Oracle Prices" → Run workflow

## API de CriptoYa

```bash
# Binance P2P
curl https://criptoya.com/api/binancep2p/USDT/BOB/0.1
# {"ask": 9.18, "bid": 9.15, "time": 1765857767}

# Bybit P2P
curl https://criptoya.com/api/bybitp2p/USDT/BOB/0.1

# Bitget P2P
curl https://criptoya.com/api/bitgetp2p/USDT/BOB/0.1
```

## Formato de Precios

- API devuelve: `9.18` (float)
- Script convierte a: `91_800_000` (7 decimales)
- Mismo formato que BOBT token

## Errores Comunes

| Error | Solución |
|-------|----------|
| `Not authorized as operator` | Agregar la address como operador en el Oracle |
| `Simulation failed` | Verificar que el contrato esté inicializado |
| `Price out of range` | CriptoYa devolvió datos inválidos |
