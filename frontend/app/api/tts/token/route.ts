import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { v4: uuidv4 } = require('uuid')
    const RQ_UID = uuidv4()
    const credentials = process.env.TTS_API_KEY

    if (!credentials) {
      console.error('❌ TTS_API_KEY not configured')
      return NextResponse.json(
        { error: 'TTS API key not configured' },
        { status: 500 }
      )
    }

    console.log('🔄 Making token request to Sber API...')
    
    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': RQ_UID,
        'Authorization': `Basic ${credentials}`
      },
      body: 'scope=SALUTE_SPEECH_PERS',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token API error:', response.status, errorText)
      throw new Error(`Token request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('✅ Token received, expires_at:', data.expires_at)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token: ' + (error as Error).message },
      { status: 500 }
    )
  }
}