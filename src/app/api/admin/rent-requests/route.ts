import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RentRequest from '@/models/RentRequest';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/middleware';

// GET all rent requests (admin only)
async function getHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    
    const rentRequests = await RentRequest.find({})
      .populate('userId', 'name email phone')
      .populate('propertyId', 'title location rent')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      rentRequests
    });
    
  } catch (error: any) {
    console.error('Get rent requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);

