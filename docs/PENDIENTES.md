# BOBT Stablecoin - Tareas Pendientes

## Estado Actual del Proyecto

### Contratos Completados (100%)

| Contrato | Tests | Estado | Funciones |
|----------|-------|--------|-----------|
| `bobt_token` | 30 | ✅ Listo | SEP-41, mint/burn, pausable, blacklist, roles |
| `oracle` | 30 | ✅ Listo | Multi-exchange P2P, agregacion, conversiones |
| `treasury` | 31 | ✅ Listo | Multi-sig, rate limits, Oracle integration |
| `upgrader` | 2 | ✅ Listo | Upgrades seguros |

**Total: 93 tests pasando**

---

### Infraestructura Completada

| Componente | Estado | Descripcion |
|------------|--------|-------------|
| Bot CriptoYa | ✅ Listo | `scripts/price-updater/` - TypeScript |
| GitHub Actions | ✅ Listo | `.github/workflows/update-prices.yml` |
| Deploy Script | ✅ Listo | `scripts/deploy/` - Automatizado |
| Testnet Deploy | ✅ Listo | Ver `deployments/testnet.json` |

---

## Testnet Deployment

### Contract Addresses

```
Oracle:     CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI
BOBT Token: CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C
Treasury:   CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV
```

### Estado del Sistema

- [x] Oracle inicializado con operador
- [x] Token inicializado con owner
- [x] Treasury inicializado (2-of-3 multi-sig)
- [x] Oracle configurado en Treasury
- [x] Treasury tiene rol MINTER
- [x] Precios actualizados desde CriptoYa

---

## Tareas Pendientes

### 1. GitHub Repository Setup (Prioridad Alta)

```bash
# Crear repo en GitHub
gh repo create Stablebob/bobt-contracts --public

# Push código
cd /Users/munay/dev/BOBT
git init
git add .
git commit -m "Initial commit: BOBT Stablecoin contracts"
git remote add origin https://github.com/Stablebob/bobt-contracts.git
git push -u origin main

# Configurar secrets
gh secret set STELLAR_SECRET_KEY --body "$(stellar keys show bobt-operator-testnet)"
gh secret set ORACLE_CONTRACT_ID --body "CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI"
```

### 2. Documentación Adicional (Prioridad Media)

| Archivo | Estado | Descripcion |
|---------|--------|-------------|
| `docs/DEPLOYMENT.md` | ✅ Listo | Guia de deploy |
| `docs/ARCHITECTURE.md` | ❌ Pendiente | Diagrama de arquitectura |
| `docs/API.md` | ❌ Pendiente | Funciones de cada contrato |
| `docs/OPERATIONS.md` | ❌ Pendiente | Guia operacional |
| `docs/SECURITY.md` | ❌ Pendiente | Consideraciones de seguridad |

### 3. Auditorías (Prioridad Alta - Pre-Mainnet)

- [ ] Auditoria de seguridad externa
- [ ] Review de codigo por terceros
- [ ] Pruebas de stress en testnet
- [ ] Simulacion de ataques

### 4. Frontend/UI (Prioridad Baja - Opcional)

- [ ] Dashboard simple para ver precios
- [ ] Interfaz para propuestas de Treasury
- [ ] Integracion con Freighter wallet

---

## Comandos Útiles

### Verificar Precios

```bash
stellar contract invoke \
  --id CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI \
  --source bobt-operator-testnet \
  --network testnet \
  -- get_price
```

### Actualizar Precios

```bash
cd scripts/price-updater && npm run update-prices
```

### Ver Deployment Config

```bash
cat deployments/testnet.json
```

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────┐
│                        OFF-CHAIN                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │ Binance P2P │     │  Bybit P2P  │     │ Bitget P2P  │      │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘      │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                          │
│                    │   CriptoYa API  │                          │
│                    │ (agregador P2P) │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Price Updater  │ ◄── GitHub Actions       │
│                    │   (cada 15min)  │     (gratis)             │
│                    └────────┬────────┘                          │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        ON-CHAIN (Soroban)                       │
├─────────────────────────────┼───────────────────────────────────┤
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │     ORACLE      │                          │
│                    │ (precios P2P)   │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│              ┌──────────────┴──────────────┐                    │
│              │                             │                    │
│              ▼                             ▼                    │
│     ┌─────────────────┐           ┌─────────────────┐          │
│     │    TREASURY     │           │   BOBT TOKEN    │          │
│     │  (multi-sig)    │──────────►│   (stablecoin)  │          │
│     │  (rate limits)  │   mint    │   (SEP-41)      │          │
│     └─────────────────┘           └─────────────────┘          │
│              ▲                             │                    │
│              │                             │                    │
│     ┌────────┴────────┐                    │                    │
│     │    Signers      │                    ▼                    │
│     │  (2-of-3)       │              ┌──────────┐              │
│     └─────────────────┘              │ Usuarios │              │
│                                      └──────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

*Documento actualizado: 2025-12-16*
