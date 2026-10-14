export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  completed: boolean;
  priority: Priority;
  created_at: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority?: Priority;
}
