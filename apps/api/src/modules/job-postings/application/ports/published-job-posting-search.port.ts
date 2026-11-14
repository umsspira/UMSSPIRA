export interface PublishedJobPostingSearchOptions {
  search?: string;
  page?: number;
  limit?: number;
}

/** Solo candidatos: los documentos del indice nunca son datos oficiales del listado. */
export interface PublishedJobPostingSearch {
  findIds(
    options: PublishedJobPostingSearchOptions & { search: string },
    now: Date,
  ): Promise<readonly string[]>;
}
