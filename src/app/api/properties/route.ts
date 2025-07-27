import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';

// GET all available properties (public)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const minRent = url.searchParams.get('minRent');
    const maxRent = url.searchParams.get('maxRent');
    const location = url.searchParams.get('location');
    
    // Build query
    let query: any = { isAvailable: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }
    
    const properties = await Property.find(query).sort({ createdAt: -1 });
    
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

