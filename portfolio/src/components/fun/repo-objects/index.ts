import type { ComponentType } from "react";
import { CardIndex } from "./CardIndex";
import { CopyingPress } from "./CopyingPress";
import { FilmReels } from "./FilmReels";
import { HomelabRack } from "./HomelabRack";
import { Lighthouse } from "./Lighthouse";
import { PhoneVise } from "./PhoneVise";
import { Radio } from "./Radio";
import { RouteBlind } from "./RouteBlind";
import { Sieve } from "./Sieve";
import { Strongbox } from "./Strongbox";
import { TrainingLog } from "./TrainingLog";
import { Typewriter } from "./Typewriter";

/** Repo name to the object that stands for it. A name missing here gets the
 *  plain box in `RepoShelf`. */
export const REPO_OBJECTS: Record<string, ComponentType> = {
  homelab: HomelabRack,
  "lawless-waf": Sieve,
  "agentic-dr": CopyingPress,
  verksted: PhoneVise,
  headroom: Strongbox,
  logeverylift: TrainingLog,
  "ruter-cli": RouteBlind,
  innestemme: Radio,
  openself: CardIndex,
  openvita: Typewriter,
  northlight: Lighthouse,
  reelsmith: FilmReels,
};
