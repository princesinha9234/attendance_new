export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${formatDate(dateString)}, ${formatTime(dateString)}`;
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

export const getAttendanceStatusColor = (status: string): string => {
  switch (status) {
    case 'PRESENT': return '#10B981';
    case 'ABSENT': return '#EF4444';
    case 'LATE': return '#F59E0B';
    default: return '#6B7280';
  }
};

export const getSessionStatusColor = (status: string): string => {
  switch (status) {
    case 'SCHEDULED': return '#3B82F6';
    case 'ONGOING': return '#10B981';
    case 'COMPLETED': return '#6B7280';
    case 'CANCELLED': return '#EF4444';
    default: return '#6B7280';
  }
};

export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'STUDENT': return 'Student';
    case 'TEACHER': return 'Teacher';
    case 'PLATFORM_OWNER': return 'Platform Owner';
    default: return role;
  }
};