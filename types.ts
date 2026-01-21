
export enum BookStatus {
  READ = 'Leído',
  REREAD = 'Releído',
  PENDING = 'Pendiente',
  ABANDONED = 'Abandonado',
  READING = 'Leyendo'
}

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  description: string;
  rating: number; // 1-5
  status: BookStatus;
  coverUrl: string;
  genres: string[];
}

export interface LibraryData {
  books: Book[];
}
