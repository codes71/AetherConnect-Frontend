'use client';

import { useAuth } from '@/context/auth-context';

export default function Profile() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">User not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="space-y-2">
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>First Name:</strong> {user.firstName}</p>
        <p><strong>Last Name:</strong> {user.lastName}</p>
        <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        <p><strong>Updated:</strong> {new Date(user.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
