/**
 * The room's printed matter. One table so a sheet on one wall is the same
 * stock as a sheet on another: the career frame, the services leaflets, the
 * pinned repositories and the blog cards are all this paper.
 *
 * Value is the brand `paper` token. Anything lighter reads as a hole cut in
 * the wall rather than a lit sheet — these are unlit DOM layers, so whatever
 * is written here is exactly what renders, next to walls no brighter than
 * `#6a5236` under lamplight.
 */
export const PAPER = {
  /** The sheet. Faces away from the lamps, so the fall is painted in. */
  stock: "linear-gradient(160deg, #eeeade 0%, #e3ddcf 100%)",
  /** Headings and the text of an entry. */
  ink: "#26313d",
  /** Body prose, one step back. */
  inkSoft: "#5d6875",
  /** Mono labels, counts, datelines. */
  label: "#8b8271",
} as const;
