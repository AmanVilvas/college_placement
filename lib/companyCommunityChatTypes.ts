export interface CommunityChatMessage {
  id: string;
  resource_id?: string | null;
  company_id: string;
  drive_id?: string | null;
  author_student_id?: string | null;
  author_name: string;
  is_mine?: boolean;
  author_role: "placement_staff" | "student";
  message_type: "text" | "file" | "poll" | "resource";
  body: string;
  resource_title?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  file_size?: number | null;
  poll_options?: string[] | null;
  poll_topic?: string | null;
  poll_votes?: number[] | null;
  my_vote?: number | null;
  reactions?: { emoji: string; count: number; mine: boolean }[];
  created_at: string;
}
