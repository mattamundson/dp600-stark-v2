import type { Flashcard } from '../../lib/schema';
import { flashcardDecks } from './fc-decks';
import { directLakeTraps } from './fc-direct-lake-traps';

export const fcBatches: Flashcard[][] = [flashcardDecks, directLakeTraps];
