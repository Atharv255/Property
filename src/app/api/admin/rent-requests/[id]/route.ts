import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RentRequest from '@/models/RentRequest';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/middleware';

// PUT update rent request status (admin only)
async function putHandler(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { status } = await request.json();
    
    // Validate status
    if (!status || !['pending', 'contacted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be pending, contacted, or rejected' },
        { status: 400 }
      );
    }
    
    // Update rent request status
    const rentRequest = await RentRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('userId', 'name email phone')
     .populate('propertyId', 'title location rent');
    
    if (!rentRequest) {
      return NextResponse.json(
        { error: 'Rent request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Rent request status updated successfully',
      rentRequest
    });
    
  } catch (error: any) {
    console.error('Update rent request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PUT = withAdminAuth(putHandler);

