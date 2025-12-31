export interface TrackChange {
  id: string;
  type: 'insertion' | 'deletion' | 'formatting';
  text: string;
  author?: string;
  timestamp?: Date;
}
export interface TrackChangeMetadata {
  totalChanges: number;
  insertions: number;
  deletions: number;
  authors: string[];
}
