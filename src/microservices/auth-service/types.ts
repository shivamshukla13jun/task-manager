export enum Role {
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
  USER = 'user',
}

export const ROLES = Object.values(Role);
export const UnAuthRoles = Object.values(Role).filter((role) => role !== Role.SUPERADMIN)



