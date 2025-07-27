import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RentRequest from '@/models/RentRequest';
import Property from '@/models/Property';
import User from '@/models/User';
import { withUserAuth, AuthenticatedRequest } from '@/lib/middleware';

// POST create rent request (user only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    
    const { propertyId } = await request.json();
    const userId = request.user!.userId;
    
    // Validate required fields
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }
    
    // Check if property exists and is available
    const property = await Property.findById(propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    if (!property.isAvailable) {
      return NextResponse.json(
        { error: 'Property is not available for rent' },
        { status: 400 }
      );
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has a pending request for this property
    const existingRequest = await RentRequest.findOne({
      userId,
      propertyId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending request for this property' },
        { status: 400 }
      );
    }
    
    // Create rent request
    const rentRequest = new RentRequest({
      userId,
      propertyId,
      userName: user.name,
      userPhone: user.phone || 'Not provided',
      propertyTitle: property.title,
      status: 'pending'
    });
    
    await rentRequest.save();
    
    return NextResponse.json({
      message: 'Rent request submitted successfully',
      rentRequest
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create rent request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET user's rent requests
async function getHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    
    const userId = request.user!.userId;
    
    const rentRequests = await RentRequest.find({ userId })
      .populate('propertyId', 'title location rent image')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      rentRequests
    });
    
  } catch (error: any) {
    console.error('Get user rent requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withUserAuth(postHandler);
export const GET = withUserAuth(getHandler);

