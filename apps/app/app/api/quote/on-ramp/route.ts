import { NextRequest, NextResponse } from 'next/server';

const FEE_PERCENT = 0.5;
const MIN_BOB = 10;
const MAX_BOB = 50000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bobAmount = Number(body.bobAmount);

    if (!bobAmount || bobAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    if (bobAmount < MIN_BOB || bobAmount > MAX_BOB) {
      return NextResponse.json(
        { success: false, error: `El monto debe estar entre ${MIN_BOB} y ${MAX_BOB} BOB` },
        { status: 400 }
      );
    }

    // Get current price from CryptoYa
    const priceResponse = await fetch('https://criptoya.com/api/usdt/bob');
    if (!priceResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el precio actual' },
        { status: 500 }
      );
    }

    const priceData = await priceResponse.json() as Record<string, { ask?: number; totalAsk?: number }>;

    // Get best ask price (what user pays)
    let bestAsk = 0;
    for (const exchange of ['binancep2p', 'bybitp2p', 'bitgetp2p']) {
      const data = priceData[exchange];
      if (data) {
        const ask = data.ask || data.totalAsk || 0;
        if (ask > 0 && (bestAsk === 0 || ask < bestAsk)) {
          bestAsk = ask;
        }
      }
    }

    if (bestAsk === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay precios disponibles' },
        { status: 500 }
      );
    }

    // Calculate amounts
    // BOB -> USD -> BOBT (1:1 with USD)
    const usdAmount = bobAmount / bestAsk;
    const feeAmount = usdAmount * (FEE_PERCENT / 100);
    const bobtAmount = usdAmount - feeAmount;

    const quote = {
      id: crypto.randomUUID().slice(0, 10),
      type: 'on_ramp' as const,
      inputAmount: bobAmount,
      inputCurrency: 'BOB' as const,
      outputAmount: Number(bobtAmount.toFixed(2)),
      outputCurrency: 'BOBT' as const,
      exchangeRate: bestAsk,
      feeAmount: Number(feeAmount.toFixed(2)),
      feePercent: FEE_PERCENT,
      validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    return NextResponse.json({ success: true, data: quote });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500 }
    );
  }
}
