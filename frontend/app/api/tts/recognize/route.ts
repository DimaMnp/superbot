import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
let ffmpegPath: string | null = null
try {
  // dynamic require to avoid build-time failure if package missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ffmpegPath = require('ffmpeg-static') as string
} catch (e) {
  ffmpegPath = null
}

export async function POST(request: NextRequest) {
  try {
    // Read binary body
    const arrayBuffer = await request.arrayBuffer()

    // Get token from Sber OAuth (same logic as /api/tts/token)
    const { v4: uuidv4 } = require('uuid')
    const RQ_UID = uuidv4()
    const credentials = process.env.TTS_API_KEY

    if (!credentials) {
      console.error('❌ TTS_API_KEY not configured')
      return NextResponse.json({ error: 'TTS API key not configured' }, { status: 500 })
    }

    const tokenResp = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': RQ_UID,
        'Authorization': `Basic ${credentials}`
      },
      body: 'scope=SALUTE_SPEECH_PERS',
    })

    if (!tokenResp.ok) {
      const text = await tokenResp.text()
      console.error('Token request failed:', tokenResp.status, text)
      return NextResponse.json({ error: 'Failed to get token' }, { status: 500 })
    }

    const tokenData = await tokenResp.json()
    const token = tokenData.access_token
    if (!token) {
      return NextResponse.json({ error: 'No token received' }, { status: 500 })
    }

    // Forward to Sber recognize endpoint
    const incomingContentType = request.headers.get('content-type') || 'audio/mpeg'

    // If incoming content-type is not supported directly by Sber, try to transcode to mp3
    const supported = [
      'audio/x-pcm',
      'audio/ogg',
      'audio/mpeg',
      'audio/flac',
      'audio/pcma',
      'audio/pcmu',
      'audio/g729'
    ]

    const lowerCT = (incomingContentType || '').toLowerCase()

    let forwardBuffer = arrayBuffer
    let forwardContentType = incomingContentType

    const isSupported = supported.some((s) => lowerCT.startsWith(s)) || lowerCT.startsWith('audio/ogg;codecs=opus')

    if (!isSupported) {
      // attempt to transcode to mp3 using ffmpeg
      // determine ffmpeg executable: prefer ffmpeg-static if available, otherwise rely on system ffmpeg in PATH
      const ffCmd = ffmpegPath || 'ffmpeg'

      // spawn ffmpeg and pipe data
      let ff
      try {
        ff = spawn(ffCmd, ['-i', 'pipe:0', '-f', 'mp3', '-b:a', '192k', 'pipe:1'])
      } catch (err: any) {
        console.error('Failed to spawn ffmpeg:', err)
        // If ENOENT, give actionable guidance
        if (err && err.code === 'ENOENT') {
          return NextResponse.json({ error: 'ffmpeg not found. Install ffmpeg or add it to PATH. On Windows you can use chocolatey: `choco install ffmpeg` or scoop: `scoop install ffmpeg`.' }, { status: 500 })
        }
        return NextResponse.json({ error: 'Failed to start ffmpeg' }, { status: 500 })
      }

      // write buffer to ffmpeg stdin
      ff.stdin.write(Buffer.from(arrayBuffer))
      ff.stdin.end()

      const chunks: Buffer[] = []
      for await (const chunk of ff.stdout) {
        chunks.push(Buffer.from(chunk))
      }

      const stderr: Buffer[] = []
      for await (const chunk of ff.stderr) {
        stderr.push(Buffer.from(chunk))
      }

  const code = await new Promise<number>((resolve) => ff.on('close', resolve))

      if (code !== 0) {
        console.error('ffmpeg failed', Buffer.concat(stderr).toString())
        return NextResponse.json({ error: 'Transcoding failed', details: Buffer.concat(stderr).toString() }, { status: 500 })
      }

      forwardBuffer = Buffer.concat(chunks).buffer
      forwardContentType = 'audio/mpeg'
    }

    const sberResp = await fetch('https://smartspeech.sber.ru/rest/v1/speech:recognize', {
      method: 'POST',
      headers: {
        'Content-Type': forwardContentType,
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: forwardBuffer
    })

    if (!sberResp.ok) {
      const txt = await sberResp.text()
      console.error('Sber recognize error:', sberResp.status, txt)
      return NextResponse.json({ error: 'Recognition failed', details: txt }, { status: 502 })
    }

    const json = await sberResp.json()
    return NextResponse.json(json)
  } catch (error) {
    console.error('Recognize route error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
