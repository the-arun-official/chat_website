import translate from 'google-translate-api-x';

export class TranslationService {
  /**
   * Translates text to the target language.
   * Also detects the original language of the text.
   * Returns an object containing the translated text and the detected language.
   */
  async translateMessage(text: string, targetLanguage: string): Promise<{ translatedText: string, detectedLanguage: string }> {
    try {
      // Use google-translate-api-x which uses public web endpoints, free from API key rate limits
      const result = await translate(text, { to: targetLanguage, autoCorrect: true });
      
      return {
        translatedText: result.text,
        detectedLanguage: result.from.language.iso
      };
    } catch (error: any) {
      console.error('Translation error:', error.message || error);
      console.error('Failed on text:', text, 'to target:', targetLanguage);
      
      throw new Error('Failed to translate message');
    }
  }
}

export const translationService = new TranslationService();
