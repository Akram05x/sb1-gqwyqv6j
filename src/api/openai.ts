import OpenAI from 'openai';

// Check if OpenAI API key is properly configured
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const isApiKeyConfigured = apiKey && apiKey !== 'your_openai_api_key_here' && !apiKey.includes('your_ope');

let openai: OpenAI | null = null;

if (isApiKeyConfigured) {
  openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, API calls should be made from a backend
  });
}

export async function generateIssueTitle(description: string): Promise<string> {
  if (!openai) {
    console.warn('OpenAI API key not configured, using fallback title generation');
    return generateFallbackTitle(description);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, clear titles for civic issues. Generate a short, descriptive title in Swedish for the given issue description. Keep it under 50 characters.'
        },
        {
          role: 'user',
          content: `Create a title for this civic issue: ${description}`
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || 'Ej kategoriserat problem';
  } catch (error) {
    console.error('Error generating title:', error);
    return generateFallbackTitle(description);
  }
}

export async function suggestIssueCategory(description: string): Promise<string> {
  if (!openai) {
    console.warn('OpenAI API key not configured, using fallback category suggestion');
    return suggestFallbackCategory(description);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that categorizes civic issues. Based on the description, return only one of these categories: pothole, streetlight, graffiti, garbage, other'
        },
        {
          role: 'user',
          content: `Categorize this civic issue: ${description}`
        }
      ],
      max_tokens: 10,
      temperature: 0.3,
    });

    const category = response.choices[0]?.message?.content?.trim().toLowerCase();
    const validCategories = ['pothole', 'streetlight', 'graffiti', 'garbage', 'other'];
    
    return validCategories.includes(category || '') ? category! : 'other';
  } catch (error) {
    console.error('Error suggesting category:', error);
    return suggestFallbackCategory(description);
  }
}

export async function validateCivicIssue(
  title: string, 
  description: string, 
  type: string,
  imageUrl?: string
): Promise<{
  isValid: boolean;
  confidence: number;
  reason: string;
  suggestedCategory?: string;
}> {
  if (!openai) {
    console.warn('OpenAI API key not configured, using fallback validation');
    return fallbackValidation(title, description, type);
  }

  try {
    const prompt = `Analyze this civic issue report for Gothenburg, Sweden and respond with ONLY a valid JSON object.

ISSUE:
Title: "${title}"
Description: "${description}"
Category: "${type}"

You must respond with EXACTLY this JSON format (no markdown, no additional text, no explanations):
{
  "isValid": true,
  "confidence": 85,
  "reason": "Valid infrastructure issue requiring municipal action",
  "suggestedCategory": "pothole"
}

VALIDATION RULES:
- Valid: Real infrastructure problems needing municipal action (potholes, broken streetlights, graffiti, garbage, damaged roads, broken benches, etc.)
- Invalid: Spam, tests (like "test", "asdf", "123"), personal complaints, non-municipal issues, nonsense
- Minimum confidence 70 for valid issues
- Check if description has actionable details for city workers
- Reject obvious test submissions like "pony in the sky", "asdf test", "123 test"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a civic issue validator for Gothenburg, Sweden. You MUST respond with ONLY valid JSON. No markdown formatting, no code blocks, no explanations - just pure JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.1, // Very low temperature for consistent JSON
    });

    const result = response.choices[0]?.message?.content?.trim();
    
    if (!result) {
      console.warn('Empty response from AI validator');
      return fallbackValidation(title, description, type);
    }

    // Log the raw response for debugging
    console.log('🤖 AI Validation Raw Response:', result);

    // Clean the response - remove any markdown formatting
    let cleanResult = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^```/g, '')
      .replace(/```$/g, '')
      .trim();

    // Additional cleaning - ensure it starts with { and ends with }
    if (!cleanResult.startsWith('{')) {
      const jsonStart = cleanResult.indexOf('{');
      if (jsonStart !== -1) {
        cleanResult = cleanResult.substring(jsonStart);
      }
    }
    
    if (!cleanResult.endsWith('}')) {
      const jsonEnd = cleanResult.lastIndexOf('}');
      if (jsonEnd !== -1) {
        cleanResult = cleanResult.substring(0, jsonEnd + 1);
      }
    }

    console.log('🧹 Cleaned AI Response:', cleanResult);
    
    try {
      const validation = JSON.parse(cleanResult);
      
      // Validate the response structure
      if (typeof validation.isValid !== 'boolean' || 
          typeof validation.confidence !== 'number' ||
          typeof validation.reason !== 'string') {
        console.error('❌ Invalid AI response structure:', validation);
        throw new Error('Invalid response structure from AI');
      }
      
      // Ensure all required fields are present and valid
      const result = {
        isValid: Boolean(validation.isValid),
        confidence: Math.min(100, Math.max(0, Number(validation.confidence) || 0)),
        reason: String(validation.reason || 'No reason provided'),
        suggestedCategory: validation.suggestedCategory || type
      };

      console.log('✅ AI Validation Result:', result);
      return result;
    } catch (parseError) {
      console.error('❌ Error parsing AI validation response:', parseError);
      console.error('Raw response:', result);
      console.error('Cleaned response:', cleanResult);
      
      // Check if the response contains obvious validation indicators
      const lowerResult = result.toLowerCase();
      if (lowerResult.includes('invalid') || lowerResult.includes('test') || lowerResult.includes('spam')) {
        return {
          isValid: false,
          confidence: 25,
          reason: 'AI detected invalid submission (JSON parse failed but content suggests invalid)',
          suggestedCategory: type
        };
      }
      
      // Fallback validation
      return fallbackValidation(title, description, type);
    }
  } catch (error) {
    console.error('❌ Error validating civic issue:', error);
    // Fallback validation
    return fallbackValidation(title, description, type);
  }
}

// Enhanced fallback validation with stricter criteria
function fallbackValidation(title: string, description: string, type: string) {
  console.log('🔄 Using fallback validation for:', { title, description, type });
  
  const titleLength = title.trim().length;
  const descriptionLength = description.trim().length;
  const titleLower = title.toLowerCase();
  const descriptionLower = description.toLowerCase();
  
  // Check for obvious test/spam indicators
  const testIndicators = [
    'test', 'testing', 'asdf', 'qwerty', '123', 'aaa', 'bbb', 'ccc',
    'hello', 'hi', 'hey', 'pony', 'unicorn', 'dragon', 'magic',
    'xxx', 'yyy', 'zzz', 'abc', 'def', 'ghi'
  ];
  
  const hasTestIndicators = testIndicators.some(indicator => 
    titleLower.includes(indicator) || descriptionLower.includes(indicator)
  );
  
  // Check for minimum quality requirements
  const hasMinimumLength = titleLength >= 8 && descriptionLength >= 15;
  const hasReasonableContent = titleLength <= 100 && descriptionLength <= 1000;
  const hasVariedCharacters = new Set(title.toLowerCase()).size > 3;
  
  // Check for civic-related keywords (Swedish and English)
  const civicKeywords = [
    // Swedish
    'hål', 'väg', 'gata', 'lampa', 'belysning', 'klotter', 'skräp', 'sopor',
    'trasig', 'sönder', 'problem', 'reparera', 'åtgärda', 'farlig', 'säkerhet',
    'trottoar', 'cykelväg', 'parkering', 'skylt', 'bänk', 'lekplats',
    'busshållplats', 'spårvagn', 'järnväg', 'bro', 'tunnel',
    // English
    'pothole', 'road', 'street', 'light', 'graffiti', 'garbage', 'broken', 'repair',
    'sidewalk', 'bike', 'parking', 'sign', 'bench', 'playground',
    'bus', 'stop', 'tram', 'bridge', 'tunnel', 'damaged', 'unsafe'
  ];
  
  const hasCivicKeywords = civicKeywords.some(keyword => 
    titleLower.includes(keyword) || descriptionLower.includes(keyword)
  );
  
  // Check for nonsensical combinations
  const nonsensePatterns = [
    /pony.*sky/i,
    /unicorn.*road/i,
    /dragon.*street/i,
    /magic.*pothole/i,
    /flying.*car/i
  ];
  
  const hasNonsensePatterns = nonsensePatterns.some(pattern =>
    pattern.test(title) || pattern.test(description)
  );
  
  const isValid = hasMinimumLength && 
                  hasReasonableContent && 
                  hasVariedCharacters && 
                  !hasTestIndicators &&
                  !hasNonsensePatterns &&
                  hasCivicKeywords;
  
  let reason = '';
  if (!isValid) {
    if (hasTestIndicators) {
      reason = 'Appears to be test submission';
    } else if (hasNonsensePatterns) {
      reason = 'Contains nonsensical content';
    } else if (!hasMinimumLength) {
      reason = 'Insufficient detail provided';
    } else if (!hasCivicKeywords) {
      reason = 'Does not appear to be a civic infrastructure issue';
    } else {
      reason = 'Failed basic quality checks';
    }
  } else {
    reason = 'Basic validation passed - appears to be legitimate civic issue';
  }

  const result = {
    isValid,
    confidence: isValid ? 75 : 25,
    reason,
    suggestedCategory: type
  };

  console.log('🔍 Fallback validation result:', result);
  return result;
}

// Fallback title generation
function generateFallbackTitle(description: string): string {
  const keywords = description.toLowerCase();
  
  if (keywords.includes('hål') || keywords.includes('pothole')) {
    return 'Hål i vägen';
  } else if (keywords.includes('lampa') || keywords.includes('belysning') || keywords.includes('streetlight')) {
    return 'Problem med gatubelysning';
  } else if (keywords.includes('klotter') || keywords.includes('graffiti')) {
    return 'Klotter som behöver rengöras';
  } else if (keywords.includes('skräp') || keywords.includes('sopor') || keywords.includes('garbage')) {
    return 'Skräp som behöver städas';
  } else {
    return 'Kommunalt problem';
  }
}

// Fallback category suggestion
function suggestFallbackCategory(description: string): string {
  const keywords = description.toLowerCase();
  
  if (keywords.includes('hål') || keywords.includes('pothole') || keywords.includes('väg')) {
    return 'pothole';
  } else if (keywords.includes('lampa') || keywords.includes('belysning') || keywords.includes('streetlight')) {
    return 'streetlight';
  } else if (keywords.includes('klotter') || keywords.includes('graffiti')) {
    return 'graffiti';
  } else if (keywords.includes('skräp') || keywords.includes('sopor') || keywords.includes('garbage')) {
    return 'garbage';
  } else {
    return 'other';
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!openai) {
    console.warn('OpenAI API key not configured, translation unavailable');
    return text;
  }

  const languageMap: Record<string, string> = {
    'sv': 'Swedish',
    'so': 'Somali',
    'ar': 'Arabic',
    'es': 'Spanish'
  };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful translator. Translate the given text to ${languageMap[targetLanguage] || 'English'}. Only return the translation, no additional text.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('Error translating text:', error);
    return text;
  }
}