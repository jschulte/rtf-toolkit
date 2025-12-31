/**
 * Track Changes API Types
 */

/**
 * Represents a single tracked change in a document
 */
export interface TrackChange {
  /** Unique identifier for this change */
  id: string;

  /** Type of change */
  type: 'insertion' | 'deletion' | 'formatting';

  /** Author who made the change */
  author: string;

  /** Author index in revision table */
  authorIndex: number;

  /** Text content of the change */
  text: string;

  /** When the change was made */
  timestamp?: Date;

  /** Position in document */
  position: {
    paragraphIndex: number;
    characterOffset: number;
  };
}

/**
 * Summary metadata for all track changes in a document
 */
export interface TrackChangeMetadata {
  /** Total number of changes */
  totalChanges: number;

  /** Number of insertions */
  insertions: number;

  /** Number of deletions */
  deletions: number;

  /** List of unique authors */
  authors: string[];

  /** Whether document has any revisions */
  hasRevisions: boolean;
}

/**
 * Options for extracting track changes
 */
export interface TrackChangeOptions {
  /** Include deleted content in extraction */
  includeDeleted?: boolean;

  /** Include formatting changes */
  includeFormatting?: boolean;

  /** Filter by author name */
  authorFilter?: string | string[];
}
