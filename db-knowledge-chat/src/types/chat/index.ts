export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: { name: string; content: string };
};

export type Session = {
  id: string;
  title: string;
  date: string;
  messages: Message[];
};