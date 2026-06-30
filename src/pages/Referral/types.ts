export interface Transaction {
  id: string | number;
  type: "commission" | "withdrawal" | "bonus" | "refund";
  status: "success" | "pending" | "failed" | "cancelled";
  title?: string;
  description?: string;
  store_name?: string;
  amount: number;
  date?: string;
  created_at?: string;
}

export interface ReferralStats {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  referredUsers: number;
  pendingCommissions: number;
  referralCode?: string;
}

export interface User {
  id: string;
  role: "buyer" | "seller" | "marketer";
}