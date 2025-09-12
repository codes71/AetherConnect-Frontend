import { NextResponse } from 'next/server';
import { AuthGrpcClient } from '@aether/shared';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const authClient = new AuthGrpcClient(process.env.AUTH_SERVICE_GRPC_URL || 'localhost:50001'); // Use server-side env var

    const userProfileResponse = await authClient.GetUserProfile({ userId });

    if (userProfileResponse.success && userProfileResponse.user) {
      return NextResponse.json({ success: true, user: userProfileResponse.user });
    } else {
      return NextResponse.json({ success: false, message: userProfileResponse.message || 'User not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}