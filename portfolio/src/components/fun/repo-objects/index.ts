import type { ComponentType } from "react";
import { AgenticDr } from "./AgenticDr";
import { Headroom } from "./Headroom";
import { Homelab } from "./Homelab";
import { Innestemme } from "./Innestemme";
import { LawlessWaf } from "./LawlessWaf";
import { LogEveryLift } from "./LogEveryLift";
import { Northlight } from "./Northlight";
import { OpenSelf } from "./OpenSelf";
import { OpenVita } from "./OpenVita";
import { Reelsmith } from "./Reelsmith";
import { RuterCli } from "./RuterCli";
import { Verksted } from "./Verksted";

/** Repo name to the object that stands for it: the repo's icon, made physical.
 *  A name missing here gets the plain box in `RepoShelf`. */
export const REPO_OBJECTS: Record<string, ComponentType> = {
  homelab: Homelab,
  "lawless-waf": LawlessWaf,
  "agentic-dr": AgenticDr,
  verksted: Verksted,
  headroom: Headroom,
  logeverylift: LogEveryLift,
  "ruter-cli": RuterCli,
  innestemme: Innestemme,
  openself: OpenSelf,
  openvita: OpenVita,
  northlight: Northlight,
  reelsmith: Reelsmith,
};
