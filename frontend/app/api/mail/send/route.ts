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
    // In Docker, use service name 'backend' for internal communication
    // API_BASE_URL is for server-side (Docker internal), NEXT_PUBLIC_API_BASE_URL is for client-side
    const apiBaseUrl = process.env.API_BASE_URL || 'http://backend:8000/api';
    const response = await fetch(`${apiBaseUrl}/mail/`, {
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
        
        // Handle specific error cases
        if (response.status === 404) {
          throw new Error('Пользователь не найден. Проверьте правильность имени.');
        } else if (response.status === 403) {
          throw new Error('У вас нет прав для отправки писем.');
        } else if (response.status === 401) {
          throw new Error('Ошибка авторизации.');
        }
        
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
