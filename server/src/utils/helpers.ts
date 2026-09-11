export const generateCompanyId = (): string => {
  return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const generateBranchId = (): string => {
  return `branch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const formatDate = (date: Date | string | undefined): string | null => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

export const toNumber = (value: any, fallback = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const paginate = (
  page: any = 1,
  limit: any = 20
): { skip: number; limit: number; page: number } => {
  const p = Math.max(1, toNumber(page, 1));
  const l = Math.min(100, Math.max(1, toNumber(limit, 20)));
  return {
    skip: (p - 1) * l,
    limit: l,
    page: p,
  };
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const randomPassword = (length = 12): string => {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const maskedName =
    name.length <= 2 ? name[0] + '*' : name.slice(0, 2) + '***';
  return `${maskedName}@${domain}`;
};

export const isPositiveInteger = (value: any): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};
