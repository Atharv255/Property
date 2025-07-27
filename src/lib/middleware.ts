import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken, JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const token = getTokenFromRequest(request);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
      
      // Add user info to request
      (request as AuthenticatedRequest).user = payload;
      
      return handler(request as AuthenticatedRequest);
      
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

export function withAdminAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (request.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return handler(request);
  });
}

export function withUserAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (request.user?.role !== 'user') {
      return NextResponse.json(
        { error: 'User access required' },
        { status: 403 }
      );
    }
    
    return handler(request);
  });
}

