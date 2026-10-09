export type MsgStatus = "sending" | "sent" | "delivered" | "read" | "error";

export interface Msg {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  status: MsgStatus;
  createdAt?: string;
}
