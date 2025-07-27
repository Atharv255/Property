import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, generateToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { email, password } = await request.json();
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Check for admin credentials first
    if (email === 'ajit@admin.com' && password === 'Ajit@123') {
      // Check if admin user exists in database
      let adminUser = await User.findOne({ email: 'ajit@admin.com' });
      
      if (!adminUser) {
        // Create admin user if doesn't exist
        const hashedPassword = await hashPassword('Ajit@123');
        adminUser = new User({
          name: 'Ajit Tiwari',
          email: 'ajit@admin.com',
          password: hashedPassword,
          role: 'admin'
        });
        await adminUser.save();
      }
      
      // Generate JWT token for admin
      const token = generateToken({
        userId: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role
      });
      
      const response = NextResponse.json({
        message: 'Admin login successful',
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role
        },
        token
      });
      
      // Set token as HTTP-only cookie
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });
      
      return response;
    }
    
    // Find user in database
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });
    
    // Return user data (without password) and token
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });
    
    // Set token as HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    return response;
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

