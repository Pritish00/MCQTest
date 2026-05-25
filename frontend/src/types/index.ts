export interface Admin {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_num: number;
}

export interface QuestionPublic {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  order_num: number;
}

export interface TestAttempt {
  id: string;
  candidate_name: string;
  candidate_email: string;
  score: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
}

export interface Test {
  id: string;
  title: string;
  topic: string;
  pin: string;
  time_limit_minutes: number;
  num_questions: number;
  is_active: boolean;
  created_at: string;
  questions: Question[];
  attempts: TestAttempt[];
}

export interface TestListItem {
  id: string;
  title: string;
  topic: string;
  pin: string;
  time_limit_minutes: number;
  num_questions: number;
  is_active: boolean;
  created_at: string;
  attempt_count: number;
}

export interface TestPublic {
  id: string;
  title: string;
  topic: string;
  time_limit_minutes: number;
  num_questions: number;
  questions: QuestionPublic[];
}

export interface ResultResponse {
  score: number;
  total_questions: number;
  percentage: number;
  candidate_name: string;
  test_title: string;
}

export interface AnswerDetail {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  selected_option: string | null;
  is_correct: boolean;
  order_num: number;
}
