export type MsgStatus = "sending" | "sent" | "read" | "error";

export interface Msg {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: MsgStatus;
  createdAt?: string;
}