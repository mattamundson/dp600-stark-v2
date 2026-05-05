import type { Flashcard } from '../../lib/schema';
import { flashcardDecks } from './fc-decks';
import { directLakeTraps } from './fc-direct-lake-traps';
import { securityDeep } from './fc-security-deep';
import { daxIteratorsDeck } from './fc-dax-iterators';

export const fcBatches: Flashcard[][] = [flashcardDecks, directLakeTraps, securityDeep, daxIteratorsDeck];
