import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl, payload } = body as { webhookUrl: string; payload: Record<string, unknown> }

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.zapier.com/')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing Zapier webhook URL' },
        { status: 400 }
      )
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        source: 'StarReviews',
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Zapier responded with ${response.status}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('zapier/send error:', error)
    return NextResponse.json({ ok: false, error: 'Failed to send to Zapier' }, { status: 500 })
  }
}
