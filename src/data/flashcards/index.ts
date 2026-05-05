import type { Flashcard, FlashcardDeck } from '../../lib/schema';
import { fcBatches } from './_batches';

export const flashcards: Flashcard[] = fcBatches.flat();

export function flashcardsByDeck(deck: FlashcardDeck): Flashcard[] {
  return flashcards.filter((f) => f.deck === deck);
}

export function flashcardById(id: string): Flashcard | undefined {
  return flashcards.find((f) => f.id === id);
}
