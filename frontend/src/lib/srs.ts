export type Grade = "AGAIN" | "HARD" | "GOOD" | "EASY";

/** The four review grades, in escalating order, with their button styling. */
export const GRADES: { grade: Grade; key: string; cls: string }[] = [
  { grade: "AGAIN", key: "review.again", cls: "border-red-500/40 text-red-300 hover:bg-red-500/15" },
  { grade: "HARD", key: "review.hard", cls: "border-amber-500/40 text-amber-300 hover:bg-amber-500/15" },
  { grade: "GOOD", key: "review.good", cls: "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15" },
  { grade: "EASY", key: "review.easy", cls: "border-sky-500/40 text-sky-300 hover:bg-sky-500/15" },
];
