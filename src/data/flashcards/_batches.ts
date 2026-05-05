import type { Flashcard } from '../../lib/schema';
import { flashcardDecks } from './fc-decks';
import { directLakeTraps } from './fc-direct-lake-traps';
import { securityDeep } from './fc-security-deep';

export const fcBatches: Flashcard[][] = [flashcardDecks, directLakeTraps, securityDeep];
