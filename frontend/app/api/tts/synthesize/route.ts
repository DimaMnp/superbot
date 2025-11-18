import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, token } = await request.json()

    if (!text || !token) {
      return NextResponse.json(
        { error: 'Text and token are required' },
        { status: 400 }
      )
    }

    const response = await fetch('https://smartspeech.sber.ru/rest/v1/text:synthesize?voice=Bys_24000', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/text'
      },
      body: text
    })

    if (!response.ok) {
      throw new Error(`TTS synthesis failed: ${response.statusText}`)
    }

    // Получаем аудио как ArrayBuffer
    const audioBuffer = await response.arrayBuffer()
    
    // Возвращаем аудио как blob
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('TTS synthesis error:', error)
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    )
  }
}