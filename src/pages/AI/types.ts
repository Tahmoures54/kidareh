export interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
}