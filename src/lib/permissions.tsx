import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

interface PermissionContextType {
  currentUser: User | null;
  currentRole: Role | null;
  users: User[];
  roles: Role[];
  setCurrentUser: (user: User | null) => void;
  hasPermission: (permissionId: string) => boolean;
  canAccessAccount: (accountId: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ 
  children: React.ReactNode, 
  users: User[], 
  roles: Role[] 
}> = ({ children, users, roles }) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem('current_user_id'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);

  useEffect(() => {
    if (currentUserId) {
      const user = users.find(u => u.id === currentUserId);
      if (user) {
        setCurrentUser(user);
        const role = roles.find(r => r.id === user.roleId);
        setCurrentRole(role || null);
        localStorage.setItem('current_user_id', currentUserId);
      } else {
        setCurrentUser(null);
        setCurrentRole(null);
      }
    } else {
      setCurrentUser(null);
      setCurrentRole(null);
      localStorage.removeItem('current_user_id');
    }
  }, [currentUserId, users, roles]);

  const hasPermission = (permissionId: string) => {
    if (!currentRole) return false;
    // Super-admin or similar could have '*' or we just check the list
    return currentRole.permissions.includes(permissionId) || currentRole.name === 'المدير العام' || currentRole.name === 'مدير النظام';
  };

  const canAccessAccount = (accountId: string) => {
    if (!currentUser) return false;
    // Admins and managers have full access
    if (currentRole?.name === 'المدير العام' || currentRole?.name === 'مدير النظام') {
      return true;
    }
    // If the user has a restricted list of allowed accounts, restrict them
    if (currentUser.allowedAccountIds && currentUser.allowedAccountIds.length > 0) {
      return currentUser.allowedAccountIds.includes(accountId);
    }
    // Default fallback: check if they have general permission
    return hasPermission('view-accounts');
  };

  const setUser = (user: User | null) => {
    setCurrentUserId(user ? user.id : null);
  };

  return (
    <PermissionContext.Provider value={{ 
      currentUser, 
      currentRole, 
      users,
      roles,
      setCurrentUser: setUser, 
      hasPermission,
      canAccessAccount
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('current_user_id') : null;
    return {
      currentUser: savedUserId ? ({ id: savedUserId } as User) : null,
      currentRole: null,
      users: [] as User[],
      roles: [] as Role[],
      setCurrentUser: () => {},
      hasPermission: () => true,
      canAccessAccount: () => true,
    };
  }
  return context;
};

export const PermissionGuard: React.FC<{ 
  permission?: string;
  elementId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, elementId, children, fallback = null }) => {
  const { hasPermission } = usePermissions();
  
  const hasPerm = permission ? hasPermission(permission) : true;
  const hasElem = elementId ? hasPermission(elementId) : true;
  
  if (hasPerm && hasElem) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};
