import type { Category, Condition, ItemStatus } from "./constants";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string;
  bio: string;
  interests: string[];
  completed_exchanges: number;
  avg_rating: number;
  review_count: number;
  is_admin?: boolean;
  onboarding_completed?: boolean;
  show_city?: boolean;
  show_rating?: boolean;
  created_at?: string;
};

export type ItemImage = { url: string; position: number };

export type Item = {
  id: string;
  owner_id: string;
  category: Category;
  title: string;
  description: string;
  condition: Condition;
  status: ItemStatus;
  attributes: Record<string, string>;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  item_images?: ItemImage[];
  owner?: Profile | null;
};

export type SwipeAction = "like" | "skip";

export type MatchStatus = "active" | "reserved" | "completed" | "cancelled";

export type Match = {
  id: string;
  status: MatchStatus;
  created_at: string;
  item_a: Item;
  item_b: Item;
  agreement?: ExchangeAgreement | null;
};

export type ExchangeStatus = "pending" | "agreed" | "completed" | "cancelled";

export type ExchangeAgreement = {
  id: string;
  match_id: string;
  user_a_id: string;
  user_b_id: string;
  user_a_agreed: boolean;
  user_b_agreed: boolean;
  user_a_completed: boolean;
  user_b_completed: boolean;
  status: ExchangeStatus;
  agreed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  agreement_id: string;
  match_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: Profile | null;
  reviewee?: Profile | null;
};

export type NotificationType =
  | "match"
  | "message"
  | "exchange_agreed"
  | "exchange_completed"
  | "review"
  | "item_status";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, string>;
  read_at: string | null;
  created_at: string;
};

export type ReportTarget = "user" | "item" | "message" | "review";
