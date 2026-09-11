import firebase from 'firebase/compat/app';

export type FirestoreTimestamp =
  | firebase.firestore.Timestamp
  | firebase.firestore.FieldValue
  | null;

export enum UserRole {
  ADMIN = 'admin',
  WORKER = 'worker',
}

export enum ProductStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
}

export interface UserProfile {
  readonly uid: string;
  name: string;
  email: string;
  companyName?: string;
  role: UserRole;
  companyId?: string;
  branchId?: string;
  isActive?: boolean;
  createdAt: FirestoreTimestamp;
}

export interface Product {
  readonly id: string;
  name: string;
  category?: string;
  price: number;
  qty: number;
  qtyUploaded?: number;
  qtySold?: number;
  qtyCurrent?: number;
  status: ProductStatus;
  imageUrls?: string[];
  imagePublicIds?: string[];
  createdBy: string;
  branchId?: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  lastSoldAt?: FirestoreTimestamp;
  lastSoldByUid?: string | null;
  lastSoldByName?: string | null;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  location: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Message {
  id: string;
  companyId: string;
  fromUid: string;
  fromName: string;
  fromEmail?: string;
  text: string;
  likedByAdmin?: boolean;
  likedAt?: any;
  likedByUid?: string | null;
  likedByName?: string | null;
  branchId?: string;
  createdAt?: any;
}

export interface Worker {
  uid: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  createdBy: string;
  branchId?: string;
  isActive?: boolean;
  createdAt?: any;
}

export interface Sale {
  readonly id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  unitsSold: number;
  soldByUid: string;
  soldByName: string;
  soldByEmail: string;
  soldAt: FirestoreTimestamp;
}
