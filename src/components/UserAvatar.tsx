import React from 'react';

interface UserAvatarProps {
  avatar?: string;
  name?: string;
  sizeClassName?: string;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  sizeClassName = 'w-10 h-10 text-xl',
  className = '',
}) => {
  const isImage =
    avatar &&
    (avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('data:image/') ||
      avatar.startsWith('/'));

  if (isImage) {
    return (
      <div
        className={`${sizeClassName} rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center ${className}`}
      >
        <img
          src={avatar}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClassName} rounded-full bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center ${className}`}
    >
      <span>{avatar || '☕'}</span>
    </div>
  );
};
