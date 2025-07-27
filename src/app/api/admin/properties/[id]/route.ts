import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/middleware';

// Helper to extract params from request URL
function getParams(request: AuthenticatedRequest) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  return { id };
}

// PUT update property (admin only)
async function putHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    const { id } = getParams(request);
    const { title, description, rent, location, image, isAvailable } = await request.json();
    
    // Validate required fields
    if (!title || !description || !rent || !location || !image) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Update property
    const property = await Property.findByIdAndUpdate(
      id,
      {
        title,
        description,
        rent: Number(rent),
        location,
        image,
        isAvailable: isAvailable !== undefined ? isAvailable : true
      },
      { new: true, runValidators: true }
    );
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Property updated successfully',
      property
    });
  } catch (error: any) {
    console.error('Update property error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE property (admin only)
async function deleteHandler(request: AuthenticatedRequest) {
  try {
    await dbConnect();
    const { id } = getParams(request);
    
    const property = await Property.findByIdAndDelete(id);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Property deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Delete property error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PUT = withAdminAuth(putHandler);
export const DELETE = withAdminAuth(deleteHandler);

