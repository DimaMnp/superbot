import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call backend API to get user's mails
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/mail/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend error:', errorData);
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    // Transform backend response to match frontend expectations
    const mails = (data.text || []).map((mail: any, index: number) => ({
      id: `${index}-${Date.now()}`,
      text: mail.msg || mail,
      sender: 'Администратор',
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      mails,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching mails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mails' },
      { status: 500 }
    );
  }
}
