export interface IndexedJobPosting {
  id: string;
  titulo: string | null;
  id_empresa: string | null;
  razon_social: string | null;
  disponible: boolean;
  created_at: string | null;
}

export interface ActiveJobPostingsResult {
  data: IndexedJobPosting[];
  total: number;
}

export interface JobPostingsSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
}