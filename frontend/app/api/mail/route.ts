import { NextRequest, NextResponse } from 'next/server';

// re-export the handlers defined in the subfolders so that clients can simply
// hit `/api/mail` rather than `/api/mail/get` or `/api/mail/send`.
// this keeps the existing UI fastpath intact and allows us to add any shared
// logic in one place if needed in future.

export { GET } from './get/route';
export { POST } from './send/route';
