import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/middleware';

// GET all properties (admin only)
async function getHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    
    const properties = await Property.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      properties
    });
    
  } catch (error: any) {
    console.error('Get properties error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new property (admin only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    
    const { title, description, rent, location, image } = await request.json();
    
    // Validate required fields
    if (!title || !description || !rent || !location || !image) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Create new property
    const property = new Property({
      title,
      description,
      rent: Number(rent),
      location,
      image,
      isAvailable: true
    });
    
    await property.save();
    
    return NextResponse.json({
      message: 'Property created successfully',
      property
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create property error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);
export const POST = withAdminAuth(postHandler);

