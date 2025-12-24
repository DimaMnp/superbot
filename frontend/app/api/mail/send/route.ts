import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { send_to, text } = body;

    // Get the auth token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!send_to || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: send_to, text' },
        { status: 400 }
      );
    }

    // Call backend API to send mail
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/mail/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        send_to,
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend error:', errorData);
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Mail sent successfully',
      data,
    });
  } catch (error) {
    console.error('Error sending mail:', error);
    return NextResponse.json(
      { error: 'Failed to send mail' },
      { status: 500 }
    );
  }
}
