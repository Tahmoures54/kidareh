export interface Conversation {
  id: string;
  storeId: string;
  storeName: string;
  lastMessage: string;
  time: string;
  timestamp: number;
  unread: number;
  avatar: string;
  online: boolean;
  lastProductId?: string;
}